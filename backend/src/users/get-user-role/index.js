const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
const response = require('./response');

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient());

exports.handler = async (event) => {
  try {
    const userId = event.requestContext?.authorizer?.claims?.sub;
    
    if (!userId) {
      return response.unauthorized('User not authenticated');
    }

    const result = await dynamoClient.send(new GetCommand({
      TableName: process.env.USER_ROLES_TABLE,
      Key: { userId }
    }));

    const userRole = result.Item || { role: 'user' };

    return response.success(userRole);

  } catch (error) {
    console.error('Get user role error:', error);
    return response.error('Failed to get user role');
  }
};