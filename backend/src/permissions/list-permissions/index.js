const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetItemCommand } = require('@aws-sdk/lib-dynamodb');
const { CognitoIdentityProviderClient, AdminGetUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
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
          const userResult = await cognitoClient.send(new AdminGetUserCommand({
            UserPoolId: process.env.COGNITO_USER_POOL_ID,
            Username: permission.userId
          }));
          const emailAttr = userResult.UserAttributes.find(attr => attr.Name === 'email');
          if (emailAttr) userEmail = emailAttr.Value;
        } catch (err) {
          console.log('Could not get user:', permission.userId);
        }

        // Get catalog name from DynamoDB
        try {
          const catalogResult = await dynamoClient.send(new GetItemCommand({
            TableName: process.env.CATALOGS_TABLE,
            Key: { catalogId: permission.catalogId }
          }));
          if (catalogResult.Item?.name) catalogName = catalogResult.Item.name;
        } catch (err) {
          console.log('Could not get catalog:', permission.catalogId);
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