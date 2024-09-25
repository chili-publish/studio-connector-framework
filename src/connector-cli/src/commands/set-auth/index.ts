import { getConnectorById } from '../../common/get-connector';
import { info, readConnectorConfig, startCommand, success } from '../../core';
import { readAccessToken } from '../../core/read-access-token';
import {
  SupportedAuth as AuthenticationType,
  ExecutionError,
  Tenant,
} from '../../core/types';
import { getConnectorProjectFileInfo } from '../../utils/connector-project';
import {
  extractAuthData,
  getRequestUrl,
  setAuthentication,
  validateAuthType,
} from './steps';
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
  projectPath: string,
  options: SetAuthenticationCommandOptions
): Promise<void> {
  startCommand('set-auth', { projectPath, options });

  const { packageJson } = getConnectorProjectFileInfo(projectPath);

  const accessToken = await readAccessToken(options.tenant);

  // store all options as vars
  const { baseUrl, environment, connectorId, usage, type, authDataFile } =
    options;

  const connectorConfig = readConnectorConfig(packageJson);

  if (connectorConfig.supportedAuth.length === 0) {
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

  info('Retrieving connector to update...');
  const { id, name } = await getConnectorById({
    baseUrl,
    connectorId,
    token: accessToken,
  });

  info('Build full request URL...');
  const requestUrl = getRequestUrl(baseUrl, environment, id, type);

  info('Set authentication...');
  await setAuthentication(
    requestUrl,
    {
      usage,
      ...authData,
    },
    accessToken
  );

  success(`"${type}" authentication is applied for "${name}" connector`, {
    id,
    name,
    type,
  });
}
