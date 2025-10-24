const { CognitoIdentityProviderClient, ListUsersCommand } = require('@aws-sdk/client-cognito-identity-provider');
const response = require('./response');

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  try {
    const command = new ListUsersCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Limit: 60
    });

    const result = await cognitoClient.send(command);

    const users = result.Users.map(user => ({
      userId: user.Username,
      email: user.Attributes.find(attr => attr.Name === 'email')?.Value,
      firstName: user.Attributes.find(attr => attr.Name === 'given_name')?.Value,
      lastName: user.Attributes.find(attr => attr.Name === 'family_name')?.Value,
      role: user.Attributes.find(attr => attr.Name === 'custom:role')?.Value || 'user',
      status: user.UserStatus,
      createdDate: user.UserCreateDate
    }));

    return response.success({ users });

  } catch (error) {
    console.error('List users error:', error);
    return response.error('Failed to list users');
  }
};