const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient());
const s3Client = new S3Client();

exports.handler = async (event) => {
  try {
    const userId = event.requestContext?.authorizer?.claims?.sub;
    
    if (!userId) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, message: 'Unauthorized' })
      };
    }

    // Get user's permissions
    const permissionsResponse = await dynamoClient.send(new QueryCommand({
      TableName: process.env.PERMISSIONS_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId }
    }));

    const catalogIds = permissionsResponse.Items?.map(p => p.catalogId) || [];

    // Get all catalogs
    const catalogsResponse = await dynamoClient.send(new ScanCommand({
      TableName: process.env.CATALOGS_TABLE
    }));

    const allCatalogs = catalogsResponse.Items || [];
    const userCatalogs = allCatalogs.filter(c => 
      c.ownerId === userId || catalogIds.includes(c.catalogId)
    );

    // Count documents
    let totalDocuments = 0;
    for (const catalog of userCatalogs) {
      if (catalog.s3Prefix) {
        try {
          const s3Response = await s3Client.send(new ListObjectsV2Command({
            Bucket: process.env.DOCUMENTS_BUCKET,
            Prefix: catalog.s3Prefix
          }));
          const docCount = (s3Response.Contents?.length || 0) - 1;
          totalDocuments += Math.max(0, docCount);
        } catch (error) {
          console.error(`Error counting docs for ${catalog.catalogId}:`, error);
        }
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        data: {
          catalogs: userCatalogs.length,
          documents: totalDocuments,
          queries: 0,
          catalogsReady: userCatalogs.filter(c => c.status === 'ready').length,
          catalogsCreating: userCatalogs.filter(c => c.status === 'creating').length
        }
      })
    };

  } catch (error) {
    console.error('Get stats error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, message: 'Failed to get stats' })
    };
  }
};
