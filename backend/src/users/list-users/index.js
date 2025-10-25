const { CognitoIdentityProviderClient, ListUsersCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
const response = require('./response');

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient());

exports.handler = async (event) => {
  try {
    const command = new ListUsersCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Limit: 60
    });

    const result = await cognitoClient.send(command);

    // Enrich users with role from DynamoDB
    const users = await Promise.all(
      result.Users.map(async (user) => {
        const userId = user.Username;
        const email = user.Attributes.find(attr => attr.Name === 'email')?.Value;
        const sub = user.Attributes.find(attr => attr.Name === 'sub')?.Value;
        let role = 'user';
        
        // Get role from DynamoDB - try by username first, then by sub, then by email
        try {
          // Try by username (could be email or UUID)
          let userRoleResult = await dynamoClient.send(new GetCommand({
            TableName: process.env.USER_ROLES_TABLE,
            Key: { userId }
          }));
          
          // If not found and username is not email, try by email
          if (!userRoleResult.Item && email && userId !== email) {
            userRoleResult = await dynamoClient.send(new GetCommand({
              TableName: process.env.USER_ROLES_TABLE,
              Key: { userId: email }
            }));
          }
          
          // If still not found, try by sub
          if (!userRoleResult.Item && sub && userId !== sub) {
            userRoleResult = await dynamoClient.send(new GetCommand({
              TableName: process.env.USER_ROLES_TABLE,
              Key: { userId: sub }
            }));
          }
          
          if (userRoleResult.Item?.role) {
            role = userRoleResult.Item.role;
          }
        } catch (err) {
          console.log('Could not get role for user:', userId, err.message);
        }
        
        return {
          userId,
          email,
          firstName: user.Attributes.find(attr => attr.Name === 'given_name')?.Value,
          lastName: user.Attributes.find(attr => attr.Name === 'family_name')?.Value,
          role,
          status: user.UserStatus,
          createdDate: user.UserCreateDate
        };
      })
    );

    return response.success({ users });

  } catch (error) {
    console.error('List users error:', error);
    return response.error('Failed to list users');
  }
};