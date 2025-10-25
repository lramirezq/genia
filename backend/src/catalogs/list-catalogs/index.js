const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { CognitoIdentityProviderClient, ListUsersCommand } = require('@aws-sdk/client-cognito-identity-provider');
const response = require('./response');

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient());
const s3Client = new S3Client();
const cognitoClient = new CognitoIdentityProviderClient();

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
      const userRoleResult = await dynamoClient.send(new GetCommand({
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

    // Enrich catalogs with document count and owner email
    const enrichedCatalogs = await Promise.all(
      (catalogsResult.Items || []).map(async (catalog) => {
        // Get document count from S3
        try {
          const listCommand = new ListObjectsV2Command({
            Bucket: process.env.DOCUMENTS_BUCKET,
            Prefix: `catalogs/${catalog.catalogId}/`
          });
          const s3Result = await s3Client.send(listCommand);
          const realFiles = (s3Result.Contents || []).filter(obj => 
            obj.Size > 0 && !obj.Key.endsWith('/')
          );
          catalog.documentCount = realFiles.length;
        } catch (err) {
          console.log('Could not count documents for catalog:', catalog.catalogId, err);
          catalog.documentCount = 0;
        }
        
        // Get owner email from Cognito by sub
        try {
          const listResult = await cognitoClient.send(new ListUsersCommand({
            UserPoolId: process.env.USER_POOL_ID,
            Filter: `sub = "${catalog.ownerId}"`
          }));
          if (listResult.Users && listResult.Users.length > 0) {
            const emailAttr = listResult.Users[0].Attributes?.find(attr => attr.Name === 'email');
            catalog.ownerEmail = emailAttr?.Value || 'Desconocido';
          } else {
            catalog.ownerEmail = 'Desconocido';
          }
        } catch (err) {
          console.log('Could not get owner email for catalog:', catalog.catalogId, err);
          catalog.ownerEmail = 'Desconocido';
        }
        
        return catalog;
      })
    );

    return response.success({ catalogs: enrichedCatalogs });

  } catch (error) {
    console.error('List catalogs error:', error);
    return response.error('Failed to list catalogs');
  }
};