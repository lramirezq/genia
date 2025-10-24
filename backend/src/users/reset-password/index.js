const { CognitoIdentityProviderClient, AdminSetUserPasswordCommand } = require('@aws-sdk/client-cognito-identity-provider');
const response = require('./response');

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  try {
    const { email: rawEmail } = event.pathParameters;
    const { newPassword } = JSON.parse(event.body);

    if (!rawEmail || !newPassword) {
      return response.error('Email and new password are required');
    }

    const email = decodeURIComponent(rawEmail);

    // Generate random password if not provided
    const password = newPassword || Math.random().toString(36).slice(-12) + 'A1!';

    await cognitoClient.send(new AdminSetUserPasswordCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: email,
      Password: password,
      Permanent: true
    }));

    return response.success({ 
      message: 'Password reset successfully',
      temporaryPassword: newPassword ? undefined : password
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return response.error('Failed to reset password');
  }
};