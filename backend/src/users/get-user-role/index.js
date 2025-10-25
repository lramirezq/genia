const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const response = require('./response');

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient());

exports.handler = async (event) => {
  try {
    const userId = event.requestContext?.authorizer?.claims?.sub;
    const email = event.requestContext?.authorizer?.claims?.email;
    
    if (!userId) {
      return response.unauthorized('User not authenticated');
    }

    // Try to get by userId (sub) first
    let result = await dynamoClient.send(new GetCommand({
      TableName: process.env.USER_ROLES_TABLE,
      Key: { userId }
    }));

    // If not found and we have email, try by email
    if (!result.Item && email) {
      result = await dynamoClient.send(new GetCommand({
        TableName: process.env.USER_ROLES_TABLE,
        Key: { userId: email }
      }));
    }

    const userRole = result.Item || { role: 'user' };

    return response.success(userRole);

  } catch (error) {
    console.error('Get user role error:', error);
    return response.error('Failed to get user role');
  }
};