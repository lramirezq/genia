const { CognitoIdentityProviderClient, AdminSetUserPasswordCommand } = require('@aws-sdk/client-cognito-identity-provider');
const response = require('./response');

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  try {
    const { email, newPassword } = JSON.parse(event.body);

    if (!email || !newPassword) {
      return response.error('Email and newPassword are required');
    }

    await cognitoClient.send(new AdminSetUserPasswordCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: email,
      Password: newPassword,
      Permanent: true
    }));

    return response.success({
      message: 'Contraseña cambiada exitosamente'
    });

  } catch (error) {
    console.error('Change password error:', error);
    return response.error('Failed to change password: ' + error.message);
  }
};