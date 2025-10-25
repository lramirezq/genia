const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, QueryCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient());

exports.handler = async (event) => {
  try {
    const userId = event.requestContext?.authorizer?.claims?.sub;
    const userEmail = event.requestContext?.authorizer?.claims?.email;
    console.log('Checking audit logs access for userId:', userId, 'email:', userEmail);
    
    // Check if user is admin
    let isAdmin = false;
    try {
      let userRoleResult = await dynamoClient.send(new GetCommand({
        TableName: process.env.USER_ROLES_TABLE,
        Key: { userId }
      }));
      console.log('Role by sub:', userRoleResult.Item);
      if (!userRoleResult.Item && userEmail) {
        userRoleResult = await dynamoClient.send(new GetCommand({
          TableName: process.env.USER_ROLES_TABLE,
          Key: { userId: userEmail }
        }));
        console.log('Role by email:', userRoleResult.Item);
      }
      isAdmin = userRoleResult.Item?.role === 'admin';
      console.log('Is admin:', isAdmin);
    } catch (err) {
      console.log('Could not check user role:', err);
    }
    
    if (!isAdmin) {
      return {
        statusCode: 403,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*'
        },
        body: JSON.stringify({ success: false, error: 'Access denied. Admin only.' })
      };
    }
    
    const queryParams = event.queryStringParameters || {};
    const filterUserId = queryParams.userId;
    const limit = parseInt(queryParams.limit) || 100;
    
    let result;
    if (filterUserId) {
      // Query by userId using GSI
      result = await dynamoClient.send(new QueryCommand({
        TableName: process.env.AUDIT_LOGS_TABLE,
        IndexName: 'UserIdIndex',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': filterUserId
        },
        Limit: limit,
        ScanIndexForward: false
      }));
    } else {
      // Scan all logs
      result = await dynamoClient.send(new ScanCommand({
        TableName: process.env.AUDIT_LOGS_TABLE,
        Limit: limit
      }));
    }
    
    const logs = (result.Items || []).sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*'
      },
      body: JSON.stringify({ success: true, data: { logs } })
    };
  } catch (error) {
    console.error('List audit logs error:', error);
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
