const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
const response = require('./response');

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient());

exports.handler = async (event) => {
  try {
    const catalogId = event.pathParameters?.catalogId;

    if (!catalogId) {
      return response.error('Catalog ID is required');
    }

    const result = await dynamoClient.send(new GetCommand({
      TableName: process.env.CATALOGS_TABLE,
      Key: { catalogId }
    }));

    if (!result.Item) {
      return response.notFound('Catalog not found');
    }

    return response.success({
      data: {
        catalogId: result.Item.catalogId,
        name: result.Item.name,
        status: result.Item.status,
        errorMessage: result.Item.errorMessage,
        progress: result.Item.progress || [],
        updatedAt: result.Item.updatedAt,
        createdAt: result.Item.createdAt
      }
    });

  } catch (error) {
    console.error('Get catalog status error:', error);
    return response.error(`Failed to get catalog status: ${error.message}`);
  }
};