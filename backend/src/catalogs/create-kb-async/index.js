const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { BedrockAgentClient, CreateKnowledgeBaseCommand, GetKnowledgeBaseCommand, CreateDataSourceCommand, CreateAgentCommand, GetAgentCommand, AssociateAgentKnowledgeBaseCommand, PrepareAgentCommand, StartIngestionJobCommand } = require('@aws-sdk/client-bedrock-agent');
const { OpenSearchServerlessClient, BatchGetCollectionCommand } = require('@aws-sdk/client-opensearchserverless');
const { defaultProvider } = require('@aws-sdk/credential-provider-node');
const { HttpRequest } = require('@aws-sdk/protocol-http');
const { SignatureV4 } = require('@aws-sdk/signature-v4');
const { Sha256 } = require('@aws-crypto/sha256-js');
const https = require('https');

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient());
const bedrockClient = new BedrockAgentClient({ region: process.env.AWS_REGION });
const ossClient = new OpenSearchServerlessClient({ region: process.env.AWS_REGION });

// Helper function to verify index exists
async function verifyIndexExists(indexName, maxRetries = 10) {
  const collectionName = 'genia-dev';
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const collections = await ossClient.send(new BatchGetCollectionCommand({
        names: [collectionName]
      }));
      
      if (!collections.collectionDetails || collections.collectionDetails.length === 0) {
        throw new Error(`Collection ${collectionName} not found`);
      }
      
      const endpoint = collections.collectionDetails[0].collectionEndpoint;
      const credentials = await defaultProvider()();
      const signer = new SignatureV4({
        credentials,
        region: process.env.AWS_REGION,
        service: 'aoss',
        sha256: Sha256
      });
      
      const request = new HttpRequest({
        method: 'GET',
        hostname: endpoint.replace('https://', ''),
        path: `/${indexName}`,
        headers: {
          'host': endpoint.replace('https://', '')
        }
      });
      
      const signedRequest = await signer.sign(request);
      
      const verifyResult = await new Promise((resolve, reject) => {
        const url = new URL(`${endpoint}/${indexName}`);
        const options = {
          hostname: url.hostname,
          path: url.pathname,
          method: 'GET',
          headers: signedRequest.headers
        };
        
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode });
          });
        });
        
        req.on('error', reject);
        req.end();
      });
      
      if (verifyResult.ok) {
        console.log(`Index ${indexName} verified on attempt ${i + 1}`);
        return true;
      }
      
      console.log(`Index not ready yet, attempt ${i + 1}/${maxRetries}`);
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
    } catch (error) {
      console.log(`Verification attempt ${i + 1} failed:`, error.message);
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  throw new Error(`Index ${indexName} not available after ${maxRetries} attempts`);
}

async function updateProgress(catalogId, step, status, message = '') {
  const steps = {
    s3: { order: 1, name: 'Crear folder S3' },
    index: { order: 2, name: 'Crear índice OpenSearch' },
    kb: { order: 3, name: 'Crear Knowledge Base' },
    datasource: { order: 4, name: 'Crear DataSource' },
    agent: { order: 5, name: 'Crear Agent' }
  };

  const progress = {
    step: steps[step].name,
    order: steps[step].order,
    status, // 'in_progress', 'completed', 'failed'
    message,
    timestamp: new Date().toISOString()
  };

  await dynamoClient.send(new UpdateCommand({
    TableName: process.env.CATALOGS_TABLE,
    Key: { catalogId },
    UpdateExpression: 'SET progress = list_append(if_not_exists(progress, :empty), :progress), updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':progress': [progress],
      ':empty': [],
      ':updatedAt': new Date().toISOString()
    }
  }));
}

exports.handler = async (event) => {
  try {
    const { catalogId, name, indexName } = event;
    
    console.log(`Starting KB creation for catalog ${catalogId}`);

    // 1. S3 folder (already created by CreateCatalog)
    await updateProgress(catalogId, 's3', 'completed', 'Folder S3 creado');

    // 2. Create OpenSearch index
    console.log(`Creating index ${indexName}...`);
    await updateProgress(catalogId, 'index', 'in_progress', 'Creando índice OpenSearch...');
    
    const collectionName = 'genia-dev';
    const collections = await ossClient.send(new BatchGetCollectionCommand({
      names: [collectionName]
    }));
    
    if (!collections.collectionDetails || collections.collectionDetails.length === 0) {
      throw new Error(`Collection ${collectionName} not found`);
    }
    
    const endpoint = collections.collectionDetails[0].collectionEndpoint;
    const credentials = await defaultProvider()();
    const signer = new SignatureV4({
      credentials,
      region: process.env.AWS_REGION,
      service: 'aoss',
      sha256: Sha256
    });
    
    // Create index with proper mapping for Bedrock
    const indexMapping = {
      settings: {
        "index.knn": true
      },
      mappings: {
        properties: {
          vector: {
            type: "knn_vector",
            dimension: 1536,
            method: {
              name: "hnsw",
              space_type: "l2",
              engine: "faiss"
            }
          },
          text: {
            type: "text"
          },
          metadata: {
            type: "text"
          }
        }
      }
    };
    
    const createRequest = new HttpRequest({
      method: 'PUT',
      hostname: endpoint.replace('https://', ''),
      path: `/${indexName}`,
      headers: {
        'Content-Type': 'application/json',
        'host': endpoint.replace('https://', '')
      },
      body: JSON.stringify(indexMapping)
    });
    
    const signedCreateRequest = await signer.sign(createRequest);
    
    const createResult = await new Promise((resolve, reject) => {
      const url = new URL(`${endpoint}/${indexName}`);
      const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: 'PUT',
        headers: signedCreateRequest.headers
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data });
        });
      });
      
      req.on('error', reject);
      req.write(signedCreateRequest.body);
      req.end();
    });
    
    if (!createResult.ok) {
      console.log('Index creation failed:', createResult.status, createResult.data);
      throw new Error(`Failed to create index: ${createResult.status}`);
    }
    
    console.log(`Index ${indexName} created successfully`);
    
    // Wait for index to be fully propagated (OpenSearch Serverless needs time)
    console.log('Waiting 30s for index propagation...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    await verifyIndexExists(indexName);
    
    // Additional wait to ensure Bedrock can see the index
    console.log('Waiting additional 30s for Bedrock visibility...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    await updateProgress(catalogId, 'index', 'completed', 'Índice creado y verificado');
    console.log(`Index verified, proceeding with KB creation`);

    // 3. Create Knowledge Base
    await updateProgress(catalogId, 'kb', 'in_progress', 'Creando Knowledge Base...');
    const kbResponse = await bedrockClient.send(new CreateKnowledgeBaseCommand({
      name: `kb-${catalogId}`,
      description: `Knowledge Base for catalog: ${name}`,
      roleArn: process.env.BEDROCK_KB_ROLE_ARN,
      knowledgeBaseConfiguration: {
        type: 'VECTOR',
        vectorKnowledgeBaseConfiguration: {
          embeddingModelArn: `arn:aws:bedrock:${process.env.AWS_REGION}::foundation-model/amazon.titan-embed-text-v1`
        }
      },
      storageConfiguration: {
        type: 'OPENSEARCH_SERVERLESS',
        opensearchServerlessConfiguration: {
          collectionArn: process.env.OPENSEARCH_COLLECTION_ARN,
          vectorIndexName: indexName,
          fieldMapping: {
            vectorField: 'vector',
            textField: 'text',
            metadataField: 'metadata'
          }
        }
      }
    }));

    const knowledgeBaseId = kbResponse.knowledgeBase.knowledgeBaseId;
    console.log(`KB created: ${knowledgeBaseId}, waiting for ACTIVE status...`);
    
    // Wait for KB to be ACTIVE
    let kbStatus = 'CREATING';
    let attempts = 0;
    while (kbStatus !== 'ACTIVE' && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s
      const { GetKnowledgeBaseCommand } = require('@aws-sdk/client-bedrock-agent');
      const kbDetails = await bedrockClient.send(new GetKnowledgeBaseCommand({ knowledgeBaseId }));
      kbStatus = kbDetails.knowledgeBase.status;
      console.log(`KB status: ${kbStatus}, attempt ${++attempts}`);
    }
    
    if (kbStatus !== 'ACTIVE') {
      throw new Error(`KB did not become ACTIVE after ${attempts} attempts`);
    }
    
    await updateProgress(catalogId, 'kb', 'completed', `KB creado: ${knowledgeBaseId}`);

    // 4. Create DataSource
    await updateProgress(catalogId, 'datasource', 'in_progress', 'Creando DataSource...');
    const dsResponse = await bedrockClient.send(new CreateDataSourceCommand({
      knowledgeBaseId,
      name: `ds-${catalogId}`,
      description: `DataSource for catalog: ${name}`,
      dataSourceConfiguration: {
        type: 'S3',
        s3Configuration: {
          bucketArn: `arn:aws:s3:::${process.env.DOCUMENTS_BUCKET}`,
          inclusionPrefixes: [`catalogs/${catalogId}/`]
        }
      }
    }));

    const dataSourceId = dsResponse.dataSource.dataSourceId;
    console.log(`DataSource created: ${dataSourceId}`);
    await updateProgress(catalogId, 'datasource', 'completed', `DataSource creado: ${dataSourceId}`);

    // 5. Start ingestion job (only if KB is ACTIVE)
    console.log(`Starting ingestion job for KB ${knowledgeBaseId}...`);
    await bedrockClient.send(new StartIngestionJobCommand({
      knowledgeBaseId,
      dataSourceId
    }));

    console.log(`Ingestion job started`);

    // 6. Create Agent
    await updateProgress(catalogId, 'agent', 'in_progress', 'Creando Agent...');
    const agentResponse = await bedrockClient.send(new CreateAgentCommand({
      agentName: `agent-${catalogId}`,
      description: `AI Agent for catalog: ${name}`,
      foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
      instruction: `You are an AI assistant specialized in answering questions about documents in the "${name}" catalog. 

IMPORTANT INSTRUCTIONS:
1. Always search the knowledge base for relevant information before answering
2. Base your answers ONLY on the information found in the documents
3. ALWAYS cite the source documents you used by mentioning their exact filenames in your response
4. If you reference information from a document, include the document name in brackets like [filename.pdf]
5. If you cannot find relevant information in the documents, say so clearly
6. Provide accurate, helpful responses based on the uploaded documents

Remember: Always include document references in your answers.`,
      agentResourceRoleArn: process.env.BEDROCK_AGENT_ROLE_ARN
    }));

    const agentId = agentResponse.agent.agentId;
    console.log(`Agent created: ${agentId}, waiting for NOT_PREPARED status...`);
    
    // Wait for Agent to be ready (NOT_PREPARED is the initial ready state)
    const { GetAgentCommand } = require('@aws-sdk/client-bedrock-agent');
    let agentStatus = 'CREATING';
    let agentAttempts = 0;
    while (agentStatus === 'CREATING' && agentAttempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
      const agentDetails = await bedrockClient.send(new GetAgentCommand({ agentId }));
      agentStatus = agentDetails.agent.agentStatus;
      console.log(`Agent status: ${agentStatus}, attempt ${++agentAttempts}`);
    }
    
    if (agentStatus === 'CREATING') {
      throw new Error(`Agent did not finish creating after ${agentAttempts} attempts`);
    }

    // 7. Associate Knowledge Base with Agent
    await bedrockClient.send(new AssociateAgentKnowledgeBaseCommand({
      agentId,
      agentVersion: 'DRAFT',
      knowledgeBaseId,
      description: `Knowledge Base for ${name}`,
      knowledgeBaseState: 'ENABLED'
    }));

    console.log(`KB associated with Agent`);

    // 7. Prepare Agent
    await bedrockClient.send(new PrepareAgentCommand({
      agentId
    }));

    console.log(`Agent prepared and ready`);
    await updateProgress(catalogId, 'agent', 'completed', `Agent creado: ${agentId}`);

    // 9. Update catalog status to ready
    await dynamoClient.send(new UpdateCommand({
      TableName: process.env.CATALOGS_TABLE,
      Key: { catalogId },
      UpdateExpression: 'SET #status = :status, knowledgeBaseId = :kbId, dataSourceId = :dsId, agentId = :agentId, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'ready',
        ':kbId': knowledgeBaseId,
        ':dsId': dsResponse.dataSource.dataSourceId,
        ':agentId': agentId,
        ':updatedAt': new Date().toISOString()
      }
    }));

    console.log(`Catalog ${catalogId} ready`);

  } catch (error) {
    console.error('KB creation error:', error);
    
    // Determine which step failed
    const errorStep = error.message.includes('index') ? 'index' :
                     error.message.includes('Knowledge Base') ? 'kb' :
                     error.message.includes('DataSource') ? 'datasource' :
                     error.message.includes('Agent') ? 'agent' : 'kb';
    
    await updateProgress(event.catalogId, errorStep, 'failed', error.message);
    
    // Update catalog status to error
    await dynamoClient.send(new UpdateCommand({
      TableName: process.env.CATALOGS_TABLE,
      Key: { catalogId: event.catalogId },
      UpdateExpression: 'SET #status = :status, errorMessage = :error, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'error',
        ':error': error.message,
        ':updatedAt': new Date().toISOString()
      }
    }));
  }
};