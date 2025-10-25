const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient());

exports.handler = async (event) => {
  try {
    const { userId, userEmail, action, resourceType, resourceId, resourceName, details } = JSON.parse(event.body);
    
    const eventId = uuidv4();
    const timestamp = new Date().toISOString();
    
    await dynamoClient.send(new PutCommand({
      TableName: process.env.AUDIT_LOGS_TABLE,
      Item: {
        eventId,
        timestamp,
        userId,
        userEmail,
        action,
        resourceType,
        resourceId,
        resourceName,
        details,
        ipAddress: event.requestContext?.identity?.sourceIp
      }
    }));
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*'
      },
      body: JSON.stringify({ success: true, eventId })
    };
  } catch (error) {
    console.error('Log event error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*'
      },
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
