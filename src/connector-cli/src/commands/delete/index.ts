import { buildRequestUrl } from '../../common/build-request-url';
import { info, readAccessToken, startCommand } from '../../core';
import { removeConnector } from './steps/remove-connector';
interface DeleteCommandOptions {
  tenant: 'dev' | 'prod';
  baseUrl: string;
  environment: string;
  connectorId: string;
}

export async function runDelete(options: DeleteCommandOptions): Promise<void> {
  startCommand('delete', { options });

  const accessToken = await readAccessToken(options.tenant);

  const { baseUrl, environment, connectorId } = options;

  info('Build full request URL...');
  const requestUrl = buildRequestUrl(baseUrl, environment);

  await removeConnector(requestUrl, connectorId, accessToken);
}
