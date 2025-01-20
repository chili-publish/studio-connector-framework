import { buildRequestUrl } from '../../common/build-request-url';
import { getConnectorById } from '../../common/get-connector';
import {
  info,
  isDryRun,
  readConnectorConfig,
  startCommand,
  success,
} from '../../core';
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
  transformAndValidate,
} from './steps';
import { prefillWithDefaults } from './steps/prefill-defaults-auth-config';
import { APIConnectorAuthentication, AuthenticationUsage } from './types';

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
      'There is no information about supported authentication for this connector. Specify "config.supportedAuth" in connector\'s package.json'
    );
  }

  if (!connectorConfig.supportedAuth.includes(type)) {
    throw new ExecutionError(
      `You are trying to set unsupported authentication "${type}". Please specify one of [${connectorConfig.supportedAuth
        .map((sa) => '"' + sa + '"')
        .join(', ')}]`
    );
  }

  info('Reading auth data...');
  const rawData = await prefillWithDefaults(
    type,
    extractAuthData(authDataFile),
    connectorConfig.authenticationConfig
  );

  info('Transforming and validating auth data...');
  const authData = transformAndValidate(type, rawData);

  info('Retrieving connector to update...');
  const { id, name } = await getConnectorById({
    baseUrl: buildRequestUrl(baseUrl, environment),
    connectorId,
    token: accessToken,
  });

  if (!authData.name) {
    authData.name = `${id}-${usage}-${type}`;
  }

  info('Build full request URL...');
  const requestUrl = getRequestUrl(baseUrl, environment, id, type);

  info('Set authentication...');
  await setAuthentication(
    requestUrl,
    {
      usage,
      ...authData,
    } as APIConnectorAuthentication,
    accessToken
  );

  success(
    `${
      isDryRun() ? '[Dry-run] ' : ''
    }"${type}" authentication is applied for "${name}" connector`,
    {
      id,
      name,
      type,
    }
  );
}
