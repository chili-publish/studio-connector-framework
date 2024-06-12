import { getAuthService, RegisteredAccessToken } from '../../authentication';
import {
  startCommand,
  validateInputConnectorPath,
  warn,
  success,
  info,
  readConnectorConfig,
} from '../../core';
import {
  extractAuthData,
  setAuthentication,
  validateAuthType,
  getRequestUrl,
} from './steps';
import {
  Tenant,
  ExecutionError,
  SupportedAuth as AuthenticationType,
} from '../../core/types';
import { AuthenticationUsage } from './types';

interface SetAuthenticationCommandOptions {
  tenant: Tenant;
  environment: string;
  baseUrl: string;
  connectorId: string;
  usage: AuthenticationUsage;
  type: AuthenticationType;
  authDataFile: string;
}

export async function runSetAuth(
  connectorPath: string,
  options: SetAuthenticationCommandOptions
): Promise<void> {
  startCommand('set-auth', { connectorPath, options });
  if (!validateInputConnectorPath(connectorPath)) {
    return;
  }

  const authService = getAuthService(options.tenant);

  if (!(await authService.isAuthenticated())) {
    warn('Please login first by "connector-cli login" command');
    return;
  }

  const accessToken = authService.sessionStorage
    .accessToken as RegisteredAccessToken;

  // store all options as vars
  const { baseUrl, environment, connectorId, usage, type, authDataFile } =
    options;

  const connectorConfig = readConnectorConfig(connectorPath);

  if (!connectorConfig.supportedAuth) {
    throw new ExecutionError(
      'There is no information about supported authentication for this connector. Specify "config.supportedAuth" in connecotr\'s package.json'
    );
  }

  info('Reading auth data...');
  const dirtyAuthData = extractAuthData(authDataFile);

  info('Validating auth data...');
  const authData = validateAuthType(
    type,
    dirtyAuthData,
    connectorConfig.supportedAuth
  );

  info('Build full request URL...');
  const requestUrl = getRequestUrl(baseUrl, environment, connectorId, type);

  info('Set authentication...');
  await setAuthentication(
    requestUrl,
    {
      usage,
      ...authData,
    },
    `${accessToken.token.token_type} ${accessToken.token.access_token}`
  );

  success(`"${type}" authentication is applied.`, { id: connectorId });
}
