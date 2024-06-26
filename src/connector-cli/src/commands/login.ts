import { AccessToken, Authentication, getAuthService } from '../authentication';
import { startCommand, info, error, verbose } from '../core';

interface LoginCommandOptions {
  tenant: 'dev' | 'prod';
}

export async function runLogin(options: LoginCommandOptions): Promise<void> {
  startCommand('login', options);

  const authService = getAuthService(options.tenant);

  if (await authService.isAuthenticated()) {
    info('Already authenticated.');
    return;
  }

  const generatedToken =
    await executeDeviceFlowAndGenerateAccessToken(authService);

  if (!generatedToken) {
    error('Failed to generate access token.');
    return;
  }

  authService.sessionStorage.accessToken = {
    token: generatedToken,
    createdAt: new Date(),
  };

  if (!(await authService.isAuthenticated())) {
    error('Failed to authenticate.');
    return;
  }
}

async function executeDeviceFlowAndGenerateAccessToken(
  authService: Authentication
): Promise<AccessToken | undefined> {
  try {
    const deviceCode = await authService.getDeviceCode();

    info(
      `Please visit "${deviceCode.verification_uri_complete}" and enter the code ${deviceCode.user_code} to authenticate.`
    );
    info('Waiting for authentication... Ctrl+C to cancel.');

    let retryCount = 0;

    const retryPromise = new Promise<AccessToken>((resolve, reject) => {
      let timeout: NodeJS.Timeout, interval: NodeJS.Timeout;
      interval = setInterval(async () => {
        try {
          retryCount++;
          if (retryCount > deviceCode.expires_in / deviceCode.interval) {
            reject('Max retries exceeded');
          }
          verbose(
            'Executing token endpoint with deviceCode ' +
              JSON.stringify(deviceCode)
          );
          const accessToken = await authService.getAccessToken(deviceCode);
          clearInterval(interval);
          clearTimeout(timeout);
          resolve(accessToken);
        } catch (error) {
          // ignore
        }
      }, deviceCode.interval * 1000);

      // Login timeout
      timeout = setTimeout(() => {
        clearInterval(interval);
        reject(new Error('Authorization timeot!'));
      }, 60 * 1000);
    });

    const accessToken = await retryPromise;
    info('CLI authenticated successfully.');

    return accessToken;
  } catch (e) {
    error(`CLI authentication failed. ${(e as Error).message}`);
    return undefined;
  }
}
