const { BedrockAgentClient, StartIngestionJobCommand, ListIngestionJobsCommand } = require('@aws-sdk/client-bedrock-agent');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
const response = require('./response');

const bedrockClient = new BedrockAgentClient({ region: process.env.AWS_REGION });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient());

exports.handler = async (event) => {
  try {
    const { catalogId } = event.pathParameters;
    const userId = event.requestContext?.authorizer?.claims?.sub;

    if (!catalogId) {
      return response.error('Catalog ID is required');
    }

    if (!userId) {
      return response.unauthorized('User not authenticated');
    }

    // Get catalog info
    const catalogResult = await dynamoClient.send(new GetCommand({
      TableName: process.env.CATALOGS_TABLE,
      Key: { catalogId }
    }));

    if (!catalogResult.Item) {
      return response.error('Catalog not found', 404);
    }

    const { knowledgeBaseId, dataSourceId, ownerId } = catalogResult.Item;

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

    // Check recent ingestion jobs
    const listJobsResult = await bedrockClient.send(new ListIngestionJobsCommand({
      knowledgeBaseId,
      dataSourceId,
      maxResults: 5
    }));

    const recentJobs = listJobsResult.ingestionJobs || [];
    const runningJob = recentJobs.find(job => job.status === 'IN_PROGRESS');

    if (runningJob) {
      return response.success({
        message: 'Ingestion job already running',
        jobId: runningJob.ingestionJobId,
        status: runningJob.status,
        startedAt: runningJob.startedAt
      });
    }

    // Start new ingestion job
    const ingestionResult = await bedrockClient.send(new StartIngestionJobCommand({
      knowledgeBaseId,
      dataSourceId,
      description: `Manual sync for catalog ${catalogId} - ${new Date().toISOString()}`
    }));

    return response.success({
      message: 'Ingestion job started successfully',
      jobId: ingestionResult.ingestionJob.ingestionJobId,
      status: ingestionResult.ingestionJob.status,
      recentJobs: recentJobs.map(job => ({
        id: job.ingestionJobId,
        status: job.status,
        startedAt: job.startedAt,
        updatedAt: job.updatedAt
      }))
    });

  } catch (error) {
    console.error('Sync catalog error:', error);
    return response.error(`Failed to sync catalog: ${error.message}`);
  }
};