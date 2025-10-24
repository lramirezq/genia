const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const response = require('./response');

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient());

exports.handler = async (event) => {
  try {
    const userId = event.requestContext?.authorizer?.claims?.sub;
    
    if (!userId) {
      return response.unauthorized('User not authenticated');
    }

    // Get catalogs owned by user or with permissions
    const catalogsResult = await dynamoClient.send(new ScanCommand({
      TableName: process.env.CATALOGS_TABLE,
      FilterExpression: 'ownerId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    }));

    return response.success({ catalogs: catalogsResult.Items || [] });

  } catch (error) {
    console.error('List catalogs error:', error);
    return response.error('Failed to list catalogs');
  }
};