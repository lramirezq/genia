const { CognitoIdentityProviderClient, AdminInitiateAuthCommand } = require('@aws-sdk/client-cognito-identity-provider');
const response = require('./response');

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  try {
    const { email, password } = JSON.parse(event.body);

    if (!email || !password) {
      return response.error('Email and password are required');
    }

    const command = new AdminInitiateAuthCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthFlow: 'ADMIN_NO_SRP_AUTH',
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password
      }
    });

    const result = await cognitoClient.send(command);

    // Check if user needs to change password
    if (result.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
      return response.success({
        challengeName: 'NEW_PASSWORD_REQUIRED',
        session: result.Session,
        message: 'Password change required. Please provide a new password.'
      });
    }

    return response.success({
      accessToken: result.AuthenticationResult.AccessToken,
      refreshToken: result.AuthenticationResult.RefreshToken,
      idToken: result.AuthenticationResult.IdToken,
      expiresIn: result.AuthenticationResult.ExpiresIn
    });

  } catch (error) {
    console.error('Login error:', error);
    
    if (error.name === 'NotAuthorizedException') {
      return response.unauthorized('Invalid credentials');
    }
    
    return response.error('Login failed');
  }
};