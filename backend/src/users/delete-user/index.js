const { CognitoIdentityProviderClient, AdminDeleteUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const response = require('./response');

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient());

exports.handler = async (event) => {
  try {
    const { email: rawEmail } = event.pathParameters;

    if (!rawEmail) {
      return response.error('Email is required');
    }

    const email = decodeURIComponent(rawEmail);
    console.log(`Deleting user: ${email}`);

    let cognitoDeleted = false;
    let dynamoDeleted = false;

    // Try to delete from Cognito
    try {
      await cognitoClient.send(new AdminDeleteUserCommand({
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        Username: email
      }));
      cognitoDeleted = true;
    } catch (cognitoError) {
      if (cognitoError.name === 'UserNotFoundException') {
        console.log(`User ${email} not found in Cognito, continuing with DynamoDB cleanup`);
      } else {
        throw cognitoError;
      }
    }

    // Delete from DynamoDB
    try {
      await dynamoClient.send(new DeleteCommand({
        TableName: process.env.USER_ROLES_TABLE,
        Key: { userId: email }
      }));
      dynamoDeleted = true;
    } catch (dynamoError) {
      console.error('DynamoDB delete error:', dynamoError);
      throw dynamoError;
    }

    // If neither existed, return not found
    if (!cognitoDeleted && !dynamoDeleted) {
      return response.error('User not found', 404);
    }

    return response.success({ 
      message: 'User deleted successfully',
      details: {
        cognitoDeleted,
        dynamoDeleted
      }
    });

  } catch (error) {
    console.error('Delete user error:', error);
    return response.error(`Failed to delete user: ${error.message}`);
  }
};