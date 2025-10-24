const { CognitoIdentityProviderClient, AdminCreateUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const response = require('./response');

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient());

exports.handler = async (event) => {
  try {
    console.log('Event received:', JSON.stringify(event, null, 2));
    
    const { email, firstName, lastName, role = 'user' } = JSON.parse(event.body);

    if (!email || !firstName || !lastName) {
      return response.error('Email, firstName, and lastName are required');
    }

    console.log('Creating user invitation for:', email);

    // Crear usuario - Cognito enviará email automáticamente
    const result = await cognitoClient.send(new AdminCreateUserCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: email,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'given_name', Value: firstName },
        { Name: 'family_name', Value: lastName },
        { Name: 'email_verified', Value: 'true' }
      ],
      DesiredDeliveryMediums: ['EMAIL']
      // MessageAction omitido = Cognito envía email de bienvenida automáticamente
    }));

    console.log('User invitation sent:', result.User.Username);

    await dynamoClient.send(new PutCommand({
      TableName: process.env.USER_ROLES_TABLE,
      Item: {
        userId: result.User.Username,
        email,
        firstName,
        lastName,
        role,
        createdAt: new Date().toISOString()
      }
    }));

    console.log('User role saved to DynamoDB');

    return response.success({
      userId: result.User.Username,
      email,
      firstName,
      lastName,
      role,
      status: result.User.UserStatus,
      message: 'Invitación enviada exitosamente. El usuario recibirá un email para establecer su contraseña.'
    });

  } catch (error) {
    console.error('Create user error:', error);
    
    if (error.name === 'UsernameExistsException') {
      return response.error('User already exists');
    }
    
    if (error.name === 'InvalidParameterException') {
      return response.error('Invalid parameters: ' + error.message);
    }
    
    return response.error('Failed to create user: ' + error.message);
  }
};