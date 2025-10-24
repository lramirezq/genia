const { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const response = require('./response');

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient());

exports.handler = async (event) => {
  try {
    const { email: rawEmail } = event.pathParameters;
    const { firstName, lastName, role } = JSON.parse(event.body);

    if (!rawEmail) {
      return response.error('Email is required');
    }

    const email = decodeURIComponent(rawEmail);

    // Update Cognito attributes
    const attributes = [];
    if (firstName) attributes.push({ Name: 'given_name', Value: firstName });
    if (lastName) attributes.push({ Name: 'family_name', Value: lastName });

    if (attributes.length > 0) {
      await cognitoClient.send(new AdminUpdateUserAttributesCommand({
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        Username: email,
        UserAttributes: attributes
      }));
    }

    // Update role in DynamoDB
    if (role) {
      await dynamoClient.send(new PutCommand({
        TableName: process.env.USER_ROLES_TABLE,
        Item: { userId: email, role }
      }));
    }

    return response.success({ message: 'User updated successfully' });

  } catch (error) {
    console.error('Update user error:', error);
    return response.error('Failed to update user');
  }
};