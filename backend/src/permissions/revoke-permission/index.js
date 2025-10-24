const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const response = require('./response');

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient());

exports.handler = async (event) => {
  try {
    const { userId, catalogId } = JSON.parse(event.body);

    if (!userId || !catalogId) {
      return response.error('userId and catalogId are required');
    }

    await dynamoClient.send(new DeleteCommand({
      TableName: process.env.PERMISSIONS_TABLE,
      Key: { userId, catalogId }
    }));

    return response.success({ message: 'Permission revoked successfully' });

  } catch (error) {
    console.error('Revoke permission error:', error);
    return response.error('Failed to revoke permission');
  }
};