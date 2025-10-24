import { Amplify } from 'aws-amplify'

export function configureAmplify() {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: 'us-east-1_hKTZfhNZy',
        userPoolClientId: '3rvqe9lr9j8k8i8siboura4jph',
        region: 'us-east-1'
      }
    },
    API: {
      REST: {
        GeniaAPI: {
          endpoint: 'https://z5bmc2llf7.execute-api.us-east-1.amazonaws.com/dev',
          region: 'us-east-1'
        }
      }
    }
  })
}