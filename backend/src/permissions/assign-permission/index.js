const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const response = require('./response');

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient());

exports.handler = async (event) => {
  try {
    const { userId, catalogId, permission = 'read' } = JSON.parse(event.body);

    if (!userId || !catalogId) {
      return response.error('UserId and catalogId are required');
    }

    await dynamoClient.send(new PutCommand({
      TableName: process.env.PERMISSIONS_TABLE,
      Item: {
        userId,
        catalogId,
        permission,
        assignedAt: new Date().toISOString(),
        assignedBy: event.requestContext?.authorizer?.claims?.sub
      }
    }));

    return response.success({
      userId,
      catalogId,
      permission,
      message: 'Permission assigned successfully'
    });

  } catch (error) {
    console.error('Assign permission error:', error);
    return response.error('Failed to assign permission');
  }
};