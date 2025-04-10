import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailStyle: "CODE",
      verificationEmailSubject: "Welcome To Michael's Very First Amplify Application",
      verificationEmailBody: (createCode) => `Use this code to confirm your account: ${createCode()}`
    }
  }
});
