const { S3Client, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
const response = require('./response');

const s3Client = new S3Client();
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient());

exports.handler = async (event) => {
  try {
    const { catalogId, documentName } = event.pathParameters;
    const userId = event.requestContext?.authorizer?.claims?.sub;

    if (!catalogId || !documentName) {
      return response.error('Catalog ID and file name are required');
    }
    
    const fileName = decodeURIComponent(documentName);

    if (!userId) {
      return response.unauthorized('User not authenticated');
    }

    // Check catalog permissions
    const catalogResult = await dynamoClient.send(new GetCommand({
      TableName: process.env.CATALOGS_TABLE,
      Key: { catalogId }
    }));

    if (!catalogResult.Item) {
      return response.error('Catalog not found', 404);
    }

    const { ownerId } = catalogResult.Item;

    // Check permissions
    const hasPermission = ownerId === userId;
    if (!hasPermission) {
      const permissionResult = await dynamoClient.send(new GetCommand({
        TableName: process.env.PERMISSIONS_TABLE,
        Key: { userId, catalogId }
      }));
      
      if (!permissionResult.Item) {
        return response.error('Access denied to this catalog', 403);
      }
    }

    // Find the actual file key (with timestamp prefix)
    const listResult = await s3Client.send(new ListObjectsV2Command({
      Bucket: process.env.DOCUMENTS_BUCKET,
      Prefix: `catalogs/${catalogId}/`,
    }));

    const file = listResult.Contents?.find(obj => 
      obj.Key.split('/').pop().replace(/^\d+-/, '') === fileName
    );

    if (!file) {
      return response.error('Document not found', 404);
    }

    // Generate presigned URL for download
    const command = new GetObjectCommand({
      Bucket: process.env.DOCUMENTS_BUCKET,
      Key: file.Key,
    });

    const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return response.success({
      downloadUrl,
      fileName,
      size: file.Size
    });

  } catch (error) {
    console.error('Download document error:', error);
    return response.error('Failed to generate download URL');
  }
};