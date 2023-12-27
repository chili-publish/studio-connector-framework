import { AccessToken, DataStore } from '../authentication';
import { error, info, startCommand } from '../logger';

export async function runLogin(options: any): Promise<void> {
  startCommand('login', options);

  if (await DataStore.isAuthenticated()) {
    info('Already authenticated.');
    return;
  }

  const generatedToken = await executeDeviceFlowAndGenerateAccessToken();

  if (!generatedToken) {
    error('Failed to generate access token.');
    return;
  }

  DataStore.accessToken = {
    token: generatedToken,
    createdAt: new Date(),
  };

  if (!(await DataStore.isAuthenticated())) {
    error('Failed to authenticate.');
    return;
  }
}

async function executeDeviceFlowAndGenerateAccessToken(): Promise<
  AccessToken | undefined
> {
  // use fetch + await to get the device code, handle errors
  const getDeviceCode = async () => {
    const url = `${DataStore.baseAuthUrl}/device/code`;
    const body = `client_id=${DataStore.clientId}&scope=${DataStore.scope}&audience=${DataStore.audience}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (response.status !== 200) {
      throw new Error(
        `Failed to get device code: ${response.status} ${response.statusText}`
      );
    }
    return response.json();
  };

  // use fetch + await to get the access token, handle errors
  const getAccessToken = async (deviceCode: any): Promise<AccessToken> => {
    const url = `${DataStore.baseAuthUrl}/token`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: deviceCode.device_code,
        client_id: 'jNa0TUPJNNT41w1afppqLHzBbTZAAv4s',
      }),
    });
    if (response.status !== 200) {
      throw new Error(
        `Failed to get access token: ${response.status} ${response.statusText}`
      );
    }
    const at = await response.json();
    return at;
  };
  try {
    const deviceCode = await getDeviceCode();

    info(
      `Please visit ${deviceCode.verification_uri_complete} and enter the code ${deviceCode.user_code} to authenticate.`
    );
    info('Waiting for authentication... Ctrl+C to cancel.');

    let retryCount = 0;

    const retryPromise = new Promise<AccessToken>((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          retryCount++;
          if (retryCount > deviceCode.expires_in / deviceCode.interval) {
            reject('Max retries exceeded');
          }
          const accessToken = await getAccessToken(deviceCode);
          clearInterval(interval);
          resolve(accessToken);
        } catch (error) {
          // ignore
        }
      }, deviceCode.interval * 1000);
    });

    const accessToken = await retryPromise;
    info('CLI authenticated successfully.');

    return accessToken;
  } catch (e) {
    error('CLI authentication failed.');
    return undefined;
  }
}
