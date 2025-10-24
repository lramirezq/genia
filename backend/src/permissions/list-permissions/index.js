const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const response = require('./response');

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient());

exports.handler = async (event) => {
  try {
    const result = await dynamoClient.send(new ScanCommand({
      TableName: process.env.PERMISSIONS_TABLE
    }));

    return response.success({ permissions: result.Items || [] });

  } catch (error) {
    console.error('List permissions error:', error);
    return response.error('Failed to list permissions');
  }
};