const { BedrockAgentClient, StartIngestionJobCommand } = require('@aws-sdk/client-bedrock-agent');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const bedrockClient = new BedrockAgentClient({ region: process.env.AWS_REGION });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient());

exports.handler = async (event) => {
  try {
    console.log('S3 Event:', JSON.stringify(event, null, 2));

    for (const record of event.Records) {
      if (record.eventName.startsWith('ObjectCreated')) {
        const bucketName = record.s3.bucket.name;
        const objectKey = record.s3.object.key;
        
        // Extract catalogId from S3 key (catalogs/{catalogId}/filename)
        const keyParts = objectKey.split('/');
        if (keyParts.length >= 2 && keyParts[0] === 'catalogs') {
          const catalogId = keyParts[1];
          
          // Get catalog info including dataSourceId
          const catalogResult = await dynamoClient.send(new GetCommand({
            TableName: process.env.CATALOGS_TABLE,
            Key: { catalogId }
          }));

          if (catalogResult.Item && catalogResult.Item.dataSourceId) {
            const { knowledgeBaseId, dataSourceId } = catalogResult.Item;
            
            // Start ingestion job to sync new document
            await bedrockClient.send(new StartIngestionJobCommand({
              knowledgeBaseId,
              dataSourceId,
              description: `Sync document: ${objectKey}`
            }));
            
            console.log(`Started ingestion job for catalog ${catalogId}, document ${objectKey}`);
          }
        }
      }
    }

    return { statusCode: 200, body: 'Sync completed' };

  } catch (error) {
    console.error('Sync error:', error);
    throw error;
  }
};