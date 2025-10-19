import { GoogleAuth } from 'google-auth-library';

/**
 * Get authenticated Google client
 */
export const getGoogleAuth = () => {
  return new GoogleAuth({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });
};

/**
 * Get access token for Google APIs
 */
export const getAccessToken = async () => {
  const auth = getGoogleAuth();
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token || '';
};