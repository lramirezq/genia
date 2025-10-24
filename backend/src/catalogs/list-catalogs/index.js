const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetItemCommand } = require('@aws-sdk/lib-dynamodb');
const response = require('./response');

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient());

exports.handler = async (event) => {
  try {
    const userId = event.requestContext?.authorizer?.claims?.sub;
    
    if (!userId) {
      return response.unauthorized('User not authenticated');
    }

    // Check if user is admin
    let isAdmin = false;
    console.log('Checking role for userId:', userId);
    console.log('USER_ROLES_TABLE:', process.env.USER_ROLES_TABLE);
    try {
      const userRoleResult = await dynamoClient.send(new GetItemCommand({
        TableName: process.env.USER_ROLES_TABLE,
        Key: { userId }
      }));
      console.log('User role result:', JSON.stringify(userRoleResult.Item));
      isAdmin = userRoleResult.Item?.role === 'admin';
      console.log('Is admin:', isAdmin);
    } catch (err) {
      console.log('Could not get user role:', err);
    }

    let catalogsResult;
    
    if (isAdmin) {
      // Admin sees ALL catalogs
      console.log('Admin user - fetching ALL catalogs');
      catalogsResult = await dynamoClient.send(new ScanCommand({
        TableName: process.env.CATALOGS_TABLE
      }));
      console.log('Catalogs found:', catalogsResult.Items?.length || 0);
    } else {
      // Regular users see only their catalogs
      console.log('Regular user - fetching only owned catalogs');
      catalogsResult = await dynamoClient.send(new ScanCommand({
        TableName: process.env.CATALOGS_TABLE,
        FilterExpression: 'ownerId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      }));
      console.log('Catalogs found:', catalogsResult.Items?.length || 0);
    }

    return response.success({ catalogs: catalogsResult.Items || [] });

  } catch (error) {
    console.error('List catalogs error:', error);
    return response.error('Failed to list catalogs');
  }
};