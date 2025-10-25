const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { BedrockAgentClient, StartIngestionJobCommand } = require('@aws-sdk/client-bedrock-agent');
const response = require('./response');

const s3Client = new S3Client();
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient());
const bedrockClient = new BedrockAgentClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  try {
    const { catalogId } = event.pathParameters;
    const userId = event.requestContext?.authorizer?.claims?.sub;
    const body = JSON.parse(event.body || '{}');
    const { fileName: originalFileName } = body;

    if (!catalogId) {
      return response.error('CatalogId is required');
    }

    if (!userId) {
      return response.unauthorized('User not authenticated');
    }

    if (!originalFileName) {
      return response.error('File name is required');
    }

    // Check catalog status and permissions
    const catalogResult = await dynamoClient.send(new GetCommand({
      TableName: process.env.CATALOGS_TABLE,
      Key: { catalogId }
    }));

    if (!catalogResult.Item) {
      return response.error('Catalog not found', 404);
    }

    const { status, ownerId, knowledgeBaseId, dataSourceId } = catalogResult.Item;

    if (status !== 'ready') {
      return response.error('Catalog is not ready for document upload. Please wait for initialization to complete.', 400);
    }

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

    // Use original filename with timestamp prefix to avoid conflicts
    const fileName = `${Date.now()}-${originalFileName}`;
    const key = `catalogs/${catalogId}/${fileName}`;

    // Generate presigned URL
    const command = new PutObjectCommand({
      Bucket: process.env.DOCUMENTS_BUCKET,
      Key: key,
      ContentType: 'application/octet-stream'
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    // Note: Ingestion job should be started manually after upload completes
    console.log(`Upload URL generated for ${originalFileName} in catalog ${catalogId}`);

    return response.success({
      uploadUrl,
      key,
      fileName,
      message: 'Upload URL generated. Use sync button to update the knowledge base after upload.',
      originalFileName
    });

  } catch (error) {
    console.error('Upload document error:', error);
    return response.error('Failed to generate upload URL');
  }
};