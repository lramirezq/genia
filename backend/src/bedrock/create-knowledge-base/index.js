const { BedrockAgentClient, CreateKnowledgeBaseCommand, CreateDataSourceCommand } = require('@aws-sdk/client-bedrock-agent');
const response = require('./response');

const bedrockClient = new BedrockAgentClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  try {
    const { catalogId, catalogName, s3Prefix } = JSON.parse(event.body);

    // 1. Create Knowledge Base
    const kbResponse = await bedrockClient.send(new CreateKnowledgeBaseCommand({
      name: `kb-${catalogId}`,
      description: `Knowledge Base for catalog: ${catalogName}`,
      roleArn: process.env.BEDROCK_KB_ROLE_ARN,
      knowledgeBaseConfiguration: {
        type: 'VECTOR',
        vectorKnowledgeBaseConfiguration: {
          embeddingModelArn: `arn:aws:bedrock:${process.env.AWS_REGION}::foundation-model/amazon.titan-embed-text-v1`
        }
      },
      storageConfiguration: {
        type: 'OPENSEARCH_SERVERLESS',
        opensearchServerlessConfiguration: {
          collectionArn: process.env.OPENSEARCH_COLLECTION_ARN,
          vectorIndexName: `index-${catalogId}`,
          fieldMapping: {
            vectorField: 'vector',
            textField: 'text',
            metadataField: 'metadata'
          }
        }
      }
    }));

    const knowledgeBaseId = kbResponse.knowledgeBase.knowledgeBaseId;

    // 2. Create DataSource
    const dsResponse = await bedrockClient.send(new CreateDataSourceCommand({
      knowledgeBaseId,
      name: `ds-${catalogId}`,
      description: `DataSource for catalog: ${catalogName}`,
      dataSourceConfiguration: {
        type: 'S3',
        s3Configuration: {
          bucketArn: `arn:aws:s3:::${process.env.DOCUMENTS_BUCKET}`,
          inclusionPrefixes: [s3Prefix]
        }
      }
    }));

    return response.success({
      knowledgeBaseId,
      dataSourceId: dsResponse.dataSource.dataSourceId,
      status: 'created'
    });

  } catch (error) {
    console.error('Create KB error:', error);
    return response.error(`Failed to create Knowledge Base: ${error.message}`);
  }
};