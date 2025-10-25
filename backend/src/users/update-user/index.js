const { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
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

    // Get existing user data from DynamoDB
    const existingUser = await dynamoClient.send(new GetCommand({
      TableName: process.env.USER_ROLES_TABLE,
      Key: { userId: email }
    }));

    // Update role in DynamoDB - merge with existing data
    const updateItem = {
      ...existingUser.Item,
      userId: email,
      email,
      updatedAt: new Date().toISOString()
    };
    
    if (firstName) updateItem.firstName = firstName;
    if (lastName) updateItem.lastName = lastName;
    if (role) updateItem.role = role;
    
    await dynamoClient.send(new PutCommand({
      TableName: process.env.USER_ROLES_TABLE,
      Item: updateItem
    }));

    return response.success({ message: 'User updated successfully' });

  } catch (error) {
    console.error('Update user error:', error);
    return response.error('Failed to update user');
  }
};