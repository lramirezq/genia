const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { BedrockRuntimeClient, InvokeAgentCommand } = require('@aws-sdk/client-bedrock-runtime');
const response = require('./response');

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient());
const bedrockClient = new BedrockRuntimeClient();

exports.handler = async (event) => {
  try {
    const { catalogId, message, sessionId } = JSON.parse(event.body);
    const userId = event.requestContext.authorizer.claims.sub;

    if (!catalogId || !message) {
      return response.error('CatalogId and message are required');
    }

    // 1. Check permissions
    const permissionResult = await dynamoClient.send(new GetCommand({
      TableName: process.env.PERMISSIONS_TABLE,
      Key: { userId, catalogId }
    }));

    if (!permissionResult.Item) {
      return response.unauthorized('No permission to access this catalog');
    }

    // 2. Get catalog info
    const catalogResult = await dynamoClient.send(new GetCommand({
      TableName: process.env.CATALOGS_TABLE,
      Key: { catalogId }
    }));

    if (!catalogResult.Item) {
      return response.error('Catalog not found');
    }

    const { agentId } = catalogResult.Item;

    // 3. Invoke Bedrock Agent
    const command = new InvokeAgentCommand({
      agentId,
      agentAliasId: 'TSTALIASID',
      sessionId: sessionId || `session-${userId}-${Date.now()}`,
      inputText: message
    });

    const agentResponse = await bedrockClient.send(command);
    
    // Process streaming response
    let responseText = '';
    for await (const chunk of agentResponse.completion) {
      if (chunk.chunk?.bytes) {
        const text = new TextDecoder().decode(chunk.chunk.bytes);
        responseText += text;
      }
    }

    return response.success({
      message: responseText,
      sessionId: command.input.sessionId,
      catalogId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat router error:', error);
    return response.error('Failed to process chat message');
  }
};