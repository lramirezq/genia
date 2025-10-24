const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const { BedrockAgentClient, DeleteAgentCommand, DeleteKnowledgeBaseCommand, DeleteDataSourceCommand } = require('@aws-sdk/client-bedrock-agent');
const response = require('./response');

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient());
const s3Client = new S3Client();
const bedrockClient = new BedrockAgentClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  try {
    const catalogId = event.pathParameters?.catalogId;
    const userId = event.requestContext?.authorizer?.claims?.sub;

    if (!catalogId) {
      return response.error('Catalog ID is required');
    }

    if (!userId) {
      return response.unauthorized('User not authenticated');
    }

    // Get catalog info
    const catalogResult = await dynamoClient.send(new GetCommand({
      TableName: process.env.CATALOGS_TABLE,
      Key: { catalogId }
    }));

    if (!catalogResult.Item) {
      return response.error('Catalog not found', 404);
    }

    if (catalogResult.Item.ownerId !== userId) {
      return response.error('Access denied', 403);
    }

    const { agentId, knowledgeBaseId, dataSourceId } = catalogResult.Item;

    // 1. Delete Agent
    if (agentId) {
      try {
        await bedrockClient.send(new DeleteAgentCommand({ agentId }));
        console.log(`Agent ${agentId} deleted`);
      } catch (error) {
        console.error('Error deleting agent:', error.message);
      }
    }

    // 2. Delete DataSource
    if (knowledgeBaseId && dataSourceId) {
      try {
        await bedrockClient.send(new DeleteDataSourceCommand({ 
          knowledgeBaseId, 
          dataSourceId 
        }));
        console.log(`DataSource ${dataSourceId} deleted`);
      } catch (error) {
        console.error('Error deleting datasource:', error.message);
      }
    }

    // 3. Delete Knowledge Base
    if (knowledgeBaseId) {
      try {
        await bedrockClient.send(new DeleteKnowledgeBaseCommand({ knowledgeBaseId }));
        console.log(`Knowledge Base ${knowledgeBaseId} deleted`);
      } catch (error) {
        console.error('Error deleting KB:', error.message);
      }
    }

    // 4. Delete S3 files
    try {
      const listResult = await s3Client.send(new ListObjectsV2Command({
        Bucket: process.env.DOCUMENTS_BUCKET,
        Prefix: `catalogs/${catalogId}/`
      }));

      if (listResult.Contents && listResult.Contents.length > 0) {
        await s3Client.send(new DeleteObjectsCommand({
          Bucket: process.env.DOCUMENTS_BUCKET,
          Delete: {
            Objects: listResult.Contents.map(obj => ({ Key: obj.Key }))
          }
        }));
        console.log(`S3 files deleted for catalog ${catalogId}`);
      }
    } catch (error) {
      console.error('Error deleting S3 files:', error.message);
    }

    // 5. Delete permissions
    try {
      const permissionsResult = await dynamoClient.send(new QueryCommand({
        TableName: process.env.PERMISSIONS_TABLE,
        IndexName: 'catalogId-index',
        KeyConditionExpression: 'catalogId = :catalogId',
        ExpressionAttributeValues: { ':catalogId': catalogId }
      }));

      if (permissionsResult.Items) {
        for (const permission of permissionsResult.Items) {
          await dynamoClient.send(new DeleteCommand({
            TableName: process.env.PERMISSIONS_TABLE,
            Key: { userId: permission.userId, catalogId }
          }));
        }
        console.log(`Permissions deleted for catalog ${catalogId}`);
      }
    } catch (error) {
      console.error('Error deleting permissions:', error.message);
    }

    // 6. Delete catalog from DynamoDB
    await dynamoClient.send(new DeleteCommand({
      TableName: process.env.CATALOGS_TABLE,
      Key: { catalogId }
    }));

    return response.success({ message: 'Catalog and all related resources deleted successfully' });

  } catch (error) {
    console.error('Delete catalog error:', error);
    return response.error('Failed to delete catalog: ' + error.message);
  }
};