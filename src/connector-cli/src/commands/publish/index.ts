import dot from 'dot-object';
import {
  startCommand,
  validateInputConnectorFile,
  validateRuntimeOptions,
  info,
  success,
  readConnectorConfig,
} from '../../core';
import { compileConnector } from './steps/compile';
import { getRequestUrl } from './steps/get-request-url';
import { createNewConnector } from './steps/create-connector';
import { updateExistingConnector } from './steps/update-connector';
import { ProxyOptions } from './types';
import { extractPackageInfo } from './steps/extract-package-info';
import { readAccessToken } from '../../core/read-access-token';
import { validateAllowedDomains } from './steps/validate-allowed-domains';

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
  connectorFile: string,
  options: PublishCommandOptions
): Promise<void> {
  startCommand('publish', { connectorFile, options });
  if (!validateInputConnectorFile(connectorFile)) {
    throw new Error('Invalid connector file path: ' + connectorFile);
  }

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

  const config = readConnectorConfig(connectorFile);

  info('Validating allowed domains option...');

  validateAllowedDomains(proxyOptions.allowedDomains);

  info('Validating runtime options...');

  validateRuntimeOptions(runtimeOptions, config.options);

  info('Extracting package information...');

  const { description, version, apiVersion } =
    extractPackageInfo(connectorFile);

  info('Compile connector...');

  const { connectorJs } = await compileConnector(connectorFile);

  // Retrieve capabilities and configurationOptions of the connector
  // const connectorInfo = await getInfoInternal(compilation);

  info('Build full request URL...');
  const requestUrl = getRequestUrl(baseUrl, environment);

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

  const result = connectorId
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
