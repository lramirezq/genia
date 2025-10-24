const { CognitoIdentityProviderClient, AdminRespondToAuthChallengeCommand } = require('@aws-sdk/client-cognito-identity-provider');
const response = require('./response');

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  try {
    const { email, newPassword, session } = JSON.parse(event.body);

    if (!email || !newPassword || !session) {
      return response.error('Email, newPassword, and session are required');
    }

    const result = await cognitoClient.send(new AdminRespondToAuthChallengeCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      ClientId: process.env.COGNITO_CLIENT_ID,
      ChallengeName: 'NEW_PASSWORD_REQUIRED',
      ChallengeResponses: {
        USERNAME: email,
        NEW_PASSWORD: newPassword
      },
      Session: session
    }));

    return response.success({
      accessToken: result.AuthenticationResult.AccessToken,
      refreshToken: result.AuthenticationResult.RefreshToken,
      idToken: result.AuthenticationResult.IdToken,
      expiresIn: result.AuthenticationResult.ExpiresIn,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Respond to challenge error:', error);
    return response.error('Failed to change password: ' + error.message);
  }
};
