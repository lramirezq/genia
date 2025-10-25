const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { CognitoIdentityProviderClient, AdminGetUserCommand, ListUsersCommand } = require('@aws-sdk/client-cognito-identity-provider');
const response = require('./response');

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient());
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  try {
    const permissionsResult = await dynamoClient.send(new ScanCommand({
      TableName: process.env.PERMISSIONS_TABLE
    }));

    const permissions = permissionsResult.Items || [];

    // Enrich permissions with user and catalog names
    const enrichedPermissions = await Promise.all(
      permissions.map(async (permission) => {
        let userEmail = permission.userId;
        let catalogName = permission.catalogId;

        // Get user email from Cognito
        try {
          // If userId looks like email, use AdminGetUser
          if (permission.userId.includes('@')) {
            const userResult = await cognitoClient.send(new AdminGetUserCommand({
              UserPoolId: process.env.COGNITO_USER_POOL_ID,
              Username: permission.userId
            }));
            const emailAttr = userResult.UserAttributes.find(attr => attr.Name === 'email');
            if (emailAttr) {
              userEmail = emailAttr.Value;
            }
          } else {
            // If userId is UUID (sub), use ListUsers with filter
            const listResult = await cognitoClient.send(new ListUsersCommand({
              UserPoolId: process.env.COGNITO_USER_POOL_ID,
              Filter: `sub = "${permission.userId}"`
            }));
            if (listResult.Users && listResult.Users.length > 0) {
              const emailAttr = listResult.Users[0].Attributes.find(attr => attr.Name === 'email');
              if (emailAttr) {
                userEmail = emailAttr.Value;
              }
            } else {
              userEmail = `Usuario eliminado (${permission.userId.substring(0, 8)}...)`;
            }
          }
        } catch (err) {
          console.log('Could not get user from Cognito:', permission.userId, err.message);
          if (permission.userId.includes('@')) {
            userEmail = permission.userId;
          } else {
            userEmail = `Usuario eliminado (${permission.userId.substring(0, 8)}...)`;
          }
        }

        // Get catalog name from DynamoDB
        try {
          const catalogResult = await dynamoClient.send(new GetCommand({
            TableName: process.env.CATALOGS_TABLE,
            Key: { catalogId: permission.catalogId }
          }));
          if (catalogResult.Item?.name) {
            catalogName = catalogResult.Item.name;
          } else {
            catalogName = `Catálogo eliminado (${permission.catalogId.substring(0, 8)}...)`;
          }
        } catch (err) {
          console.log('Could not get catalog:', permission.catalogId, err.message);
          catalogName = `Catálogo eliminado (${permission.catalogId.substring(0, 8)}...)`;
        }

        return {
          ...permission,
          userEmail,
          catalogName
        };
      })
    );

    return response.success({ permissions: enrichedPermissions });

  } catch (error) {
    console.error('List permissions error:', error);
    return response.error('Failed to list permissions');
  }
};