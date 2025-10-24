const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { OpenSearchServerlessClient, BatchGetCollectionCommand } = require('@aws-sdk/client-opensearchserverless');
const { defaultProvider } = require('@aws-sdk/credential-provider-node');
const { HttpRequest } = require('@aws-sdk/protocol-http');
const { SignatureV4 } = require('@aws-sdk/signature-v4');
const { Sha256 } = require('@aws-crypto/sha256-js');
const { v4: uuidv4 } = require('uuid');
const https = require('https');
const response = require('./response');

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient());
const s3Client = new S3Client();
const ossClient = new OpenSearchServerlessClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  try {
    const { name, description } = JSON.parse(event.body);
    const userId = event.requestContext?.authorizer?.claims?.sub;
    const catalogId = uuidv4();

    if (!name) {
      return response.error('Catalog name is required');
    }

    if (!userId) {
      return response.unauthorized('User not authenticated');
    }

    const s3Prefix = `catalogs/${catalogId}/`;

    // 1. Create S3 folder
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.DOCUMENTS_BUCKET,
      Key: s3Prefix,
      Body: ''
    }));

    // 2. Generate index name (Bedrock will create it automatically)
    const indexName = `index-${catalogId}`;

    // 3. Save catalog immediately with creating status
    await dynamoClient.send(new PutCommand({
      TableName: process.env.CATALOGS_TABLE,
      Item: {
        catalogId,
        name,
        description: description || '',
        ownerId: userId,
        s3Prefix,
        status: 'creating',
        createdAt: new Date().toISOString(),
        documentCount: 0
      }
    }));

    // 4. Auto-assign write permission to creator
    await dynamoClient.send(new PutCommand({
      TableName: process.env.PERMISSIONS_TABLE,
      Item: {
        userId,
        catalogId,
        permission: 'write',
        createdAt: new Date().toISOString()
      }
    }));

    // 5. Trigger async KB creation
    const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
    const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
    
    await lambdaClient.send(new InvokeCommand({
      FunctionName: process.env.CREATE_KB_FUNCTION_NAME,
      InvocationType: 'Event',
      Payload: JSON.stringify({ catalogId, name, indexName })
    }));

    return response.success({
      catalogId,
      name,
      description,
      status: 'creating',
      message: 'Catalog creation started. Knowledge Base is being created in background.'
    });

  } catch (error) {
    console.error('Create catalog error:', error);
    return response.error(`Failed to create catalog: ${error.message}`);
  }
};