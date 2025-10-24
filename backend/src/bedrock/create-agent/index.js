const { BedrockAgentClient, CreateAgentCommand, AssociateAgentKnowledgeBaseCommand } = require('@aws-sdk/client-bedrock-agent');
const response = require('./response');

const bedrockClient = new BedrockAgentClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  try {
    const { catalogId, catalogName, knowledgeBaseId } = JSON.parse(event.body);

    // 1. Create Agent
    const agentResponse = await bedrockClient.send(new CreateAgentCommand({
      agentName: `agent-${catalogId}`,
      description: `AI Agent for catalog: ${catalogName}`,
      foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
      instruction: `You are an AI assistant specialized in answering questions about documents in the "${catalogName}" catalog. Use the knowledge base to provide accurate, helpful responses based on the uploaded documents.`,
      agentResourceRoleArn: process.env.BEDROCK_AGENT_ROLE_ARN
    }));

    const agentId = agentResponse.agent.agentId;

    // 2. Associate Knowledge Base with Agent
    await bedrockClient.send(new AssociateAgentKnowledgeBaseCommand({
      agentId,
      agentVersion: 'DRAFT',
      knowledgeBaseId,
      description: `Knowledge Base for ${catalogName}`,
      knowledgeBaseState: 'ENABLED'
    }));

    return response.success({
      agentId,
      knowledgeBaseId,
      status: 'created'
    });

  } catch (error) {
    console.error('Create Agent error:', error);
    return response.error(`Failed to create Agent: ${error.message}`);
  }
};