const { BedrockAgentRuntimeClient, InvokeAgentCommand } = require('@aws-sdk/client-bedrock-agent-runtime');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
const response = require('./response');

const bedrockRuntimeClient = new BedrockAgentRuntimeClient({ region: process.env.AWS_REGION });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient());

exports.handler = async (event) => {
  try {
    const { catalogId, message, sessionId } = JSON.parse(event.body);
    const userId = event.requestContext?.authorizer?.claims?.sub;

    if (!catalogId || !message) {
      return response.error('Catalog ID and message are required', 400);
    }

    if (!userId) {
      return response.unauthorized('User not authenticated');
    }

    // 1. Get catalog info including agentId
    const catalogResult = await dynamoClient.send(new GetCommand({
      TableName: process.env.CATALOGS_TABLE,
      Key: { catalogId }
    }));

    if (!catalogResult.Item) {
      return response.error('Catalog not found', 404);
    }

    const { agentId, ownerId } = catalogResult.Item;

    // 2. Check if user has permission to access this catalog
    let hasPermission = ownerId === userId;
    
    if (!hasPermission) {
      // Check if user is admin
      const userEmail = event.requestContext?.authorizer?.claims?.email;
      try {
        // Try by sub first
        let userRoleResult = await dynamoClient.send(new GetCommand({
          TableName: process.env.USER_ROLES_TABLE,
          Key: { userId }
        }));
        // If not found by sub, try by email
        if (!userRoleResult.Item && userEmail) {
          userRoleResult = await dynamoClient.send(new GetCommand({
            TableName: process.env.USER_ROLES_TABLE,
            Key: { userId: userEmail }
          }));
        }
        if (userRoleResult.Item?.role === 'admin') {
          hasPermission = true;
        }
      } catch (err) {
        console.log('Could not check user role:', err);
      }
    }
    
    if (!hasPermission) {
      // Check if user has explicit permission
      const permissionResult = await dynamoClient.send(new GetCommand({
        TableName: process.env.PERMISSIONS_TABLE,
        Key: { userId, catalogId }
      }));
      
      if (!permissionResult.Item) {
        return response.error('Access denied to this catalog', 403);
      }
    }

    if (!agentId) {
      return response.error('Agent not configured for this catalog', 400);
    }

    // Check for greetings first
    const greetings = ['hola', 'hello', 'hi', 'buenos días', 'buenas tardes', 'buenas noches', 'saludos'];
    const isGreeting = greetings.some(greeting => 
      message.toLowerCase().trim().includes(greeting) && message.trim().length < 20
    );

    if (isGreeting) {
      return response.success({
        response: `¡Hola! Soy **GenIA**, tu asistente de documentos para el catálogo **${catalogResult.Item.name}**. \n\nPuedo ayudarte a:\n- 📄 Buscar información en los documentos\n- 💡 Responder preguntas sobre el contenido\n- 🔍 Encontrar datos específicos\n\n¿Qué te gustaría saber?`,
        sources: [],
        sessionId: sessionId || `session-${userId}-${Date.now()}`,
        catalogId
      });
    }

    // Invoke Bedrock Agent
    const agentResponse = await bedrockRuntimeClient.send(new InvokeAgentCommand({
      agentId,
      agentAliasId: 'TSTALIASID', // Default test alias
      sessionId: sessionId || `session-${userId}-${Date.now()}`,
      inputText: message
    }));

    // Process streaming response with timeout
    let responseText = '';
    let citations = [];
    const startTime = Date.now();
    const maxTime = 20000; // 20 seconds to stay under API Gateway limit
    
    try {
      for await (const chunk of agentResponse.completion) {
        if (Date.now() - startTime > maxTime) {
          responseText += '\n\n[Respuesta cortada por tiempo - intenta una pregunta más específica]';
          break;
        }
        
        if (chunk.chunk?.bytes) {
          const text = new TextDecoder().decode(chunk.chunk.bytes);
          responseText += text;
        }
        
        // Extract citations from agent response - multiple trace types
        if (chunk.trace?.trace) {
          const trace = chunk.trace.trace;
          
          // Type 1: knowledgeBaseRetrievalTrace
          if (trace.knowledgeBaseRetrievalTrace?.retrievalResults) {
            trace.knowledgeBaseRetrievalTrace.retrievalResults.forEach(result => {
              if (result.location?.s3Location?.uri) {
                const uri = result.location.s3Location.uri;
                const fileName = uri.split('/').pop();
                if (fileName && !citations.find(c => c.name === fileName)) {
                  citations.push({ name: fileName.replace(/^\d+-/, '') });
                }
              }
            });
          }
          
          // Type 2: orchestrationTrace with modelInvocationInput
          if (trace.orchestrationTrace?.modelInvocationInput?.text) {
            const text = trace.orchestrationTrace.modelInvocationInput.text;
            const s3UriPattern = /s3:\/\/[^\s]+\/([^\s\/]+)/g;
            let match;
            while ((match = s3UriPattern.exec(text)) !== null) {
              const fileName = match[1].replace(/^\d+-/, '');
              if (!citations.find(c => c.name === fileName)) {
                citations.push({ name: fileName });
              }
            }
          }
          
          // Type 3: Log full trace for debugging
          console.log('Trace type:', Object.keys(trace)[0]);
          if (trace.orchestrationTrace || trace.knowledgeBaseRetrievalTrace) {
            console.log('Full trace:', JSON.stringify(trace, null, 2));
          }
        }
      }
    } catch (streamError) {
      console.error('Streaming error:', streamError);
      if (!responseText) {
        responseText = '¡Hola! ¿En qué puedo ayudarte con los documentos de este catálogo?';
      }
    }

    // Extract sources from response text patterns
    const sourcePatterns = [
      /\[([^\]]+\.(?:pdf|doc|docx|txt|md|xls|xlsx))\]/gi,
      /documento[^"]*"([^"]+\.(?:pdf|doc|docx|txt|md|xls|xlsx))"/gi,
      /archivo[^"]*"([^"]+\.(?:pdf|doc|docx|txt|md|xls|xlsx))"/gi,
      /"([^"]+\.(?:pdf|doc|docx|txt|md|xls|xlsx))"/gi
    ];
    
    sourcePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(responseText)) !== null) {
        const fileName = match[1].replace(/^\d+-/, ''); // Remove timestamp prefix
        if (!citations.find(c => c.name === fileName)) {
          citations.push({ name: fileName });
        }
      }
    });
    
    // Get all documents in catalog
    const { S3Client: S3, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
    const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
    const s3 = new S3();
    
    const listResult = await s3.send(new ListObjectsV2Command({
      Bucket: process.env.DOCUMENTS_BUCKET,
      Prefix: `catalogs/${catalogId}/`,
    }));
    
    const allFiles = (listResult.Contents || [])
      .filter(obj => obj.Key !== `catalogs/${catalogId}/` && obj.Size > 0 && !obj.Key.endsWith('/'))
      .map(obj => ({
        key: obj.Key,
        name: obj.Key.split('/').pop().replace(/^\d+-/, '')
      }));
    
    // If still no citations and response has content, try fuzzy matching with file names
    if (citations.length === 0 && responseText.length > 100) {
      console.log('Attempting fuzzy match. Files:', allFiles.map(f => f.name));
      allFiles.forEach(file => {
        const fileNameLower = file.name.toLowerCase().replace(/\.[^.]+$/, '').replace(/[\[\]()]/g, ' ');
        const responseTextLower = responseText.toLowerCase();
        // Check if significant parts of filename appear in response
        const words = fileNameLower.split(/[-_\s]+/).filter(w => w.length > 3);
        console.log(`Checking ${file.name}: words=${words.join(',')}`);
        const matchedWords = words.filter(word => responseTextLower.includes(word));
        console.log(`Matched words: ${matchedWords.join(',')}`);
        // Match if at least 1 significant word matches
        if (matchedWords.length > 0) {
          citations.push({ name: file.name });
          console.log(`Added ${file.name} as citation`);
        }
      });
      console.log(`Fuzzy matched ${citations.length} documents from response text`);
    }
    
    // Generate download URLs for citations
    for (const citation of citations) {
      try {
        const file = allFiles.find(f => f.name === citation.name);
        
        if (file) {
          const downloadCommand = new GetObjectCommand({
            Bucket: process.env.DOCUMENTS_BUCKET,
            Key: file.key,
          });
          citation.downloadUrl = await getSignedUrl(s3, downloadCommand, { expiresIn: 3600 });
          console.log(`Generated download URL for ${citation.name}: ${citation.downloadUrl ? 'SUCCESS' : 'FAILED'}`);
        } else {
          console.log(`File not found for citation: ${citation.name}`);
        }
      } catch (error) {
        console.error(`Error generating download URL for ${citation.name}:`, error);
      }
    }

    console.log(`Citations found: ${citations.length}`, citations.map(c => c.name));
    
    return response.success({
      response: responseText,
      sources: citations,
      sessionId: agentResponse.sessionId,
      catalogId
    });

  } catch (error) {
    console.error('Chat error:', error);
    return response.error(`Failed to process chat: ${error.message}`);
  }
};