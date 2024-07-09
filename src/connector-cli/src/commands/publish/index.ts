import dot from 'dot-object';
import { buildRequestUrl } from '../../common/build-request-url';
import {
  info,
  readConnectorConfig,
  startCommand,
  validateRuntimeOptions,
} from '../../core';
import { readAccessToken } from '../../core/read-access-token';
import { getConnectorProjectFileInfo } from '../../utils/connector-project';
import { compileConnector } from './steps/compile';
import { createNewConnector } from './steps/create-connector';
import { extractPackageInfo } from './steps/extract-package-info';
import { updateExistingConnector } from './steps/update-connector';
import { validateAllowedDomains } from './steps/validate-allowed-domains';
import { ProxyOptions } from './types';

interface PublishCommandOptions {
  tenant: 'dev' | 'prod';
  baseUrl: string;
  environment: string;
  name: string;
  connectorId?: string;
  runtimeOption?: Record<string, unknown>;
  ['proxyOption.allowedDomains']?: Array<string>;
  ['proxyOption.forwardedHeaders']?: true;
}

export async function runPublish(
  projectPath: string,
  options: PublishCommandOptions
): Promise<void> {
  startCommand('publish', { projectPath, options });

  const accessToken = await readAccessToken(options.tenant);

  // store all options as vars
  const {
    baseUrl,
    environment,
    name,
    connectorId,
    runtimeOption: runtimeOptions,
    ...rawProxyOptions
  } = options;

  const proxyOptions: Pick<ProxyOptions, 'allowedDomains'> &
    Partial<Omit<ProxyOptions, 'allowedDomains'>> = (
    dot.object(rawProxyOptions) as any
  )?.['proxyOption'] ?? { allowedDomains: [] };

  const { connectorFile, projectDir, packageJson } =
    getConnectorProjectFileInfo(projectPath);

  const config = readConnectorConfig(packageJson);

  info('Validating allowed domains option...');

  validateAllowedDomains(proxyOptions.allowedDomains);

  info('Validating runtime options...');

  validateRuntimeOptions(runtimeOptions, config.options);

  info('Extracting package information...');

  const { description, version, apiVersion } = extractPackageInfo(
    projectDir,
    packageJson
  );

  info('Compiling connector...');

  const { connectorJs } = await compileConnector(connectorFile);

  // Retrieve capabilities and configurationOptions of the connector
  // const connectorInfo = await getInfoInternal(compilation);

  info('Build full request URL...');
  const requestUrl = buildRequestUrl(baseUrl, environment);

  const connectorPayload = {
    name,
    description,
    version,
    type: config.type,
    iconUrl: config.iconUrl,
    options: runtimeOptions,
    script: connectorJs,
    apiVersion,
    allowedDomains: proxyOptions.allowedDomains ?? ['*'],
    proxyOptions: {
      forwardedHeaders: !!proxyOptions.forwardedHeaders,
    },
  };

  connectorId
    ? await updateExistingConnector(
        requestUrl,
        connectorId,
        accessToken,
        connectorPayload
      )
    : await createNewConnector(requestUrl, accessToken, {
        ...connectorPayload,
        enabled: true,
      });
}
