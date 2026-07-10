import { buildRequestUrl } from '../../common/build-request-url';
import { getConnectorById } from '../../common/get-connector';
import { info, isDryRun, startCommand } from '../../core';
import { readAccessToken } from '../../core/read-access-token';
import { Tenant } from '../../core/types';
import { AuthenticationUsage } from '../set-auth/types';
import { removeConnectorAuthentication } from './steps/remove-connector-authentication';

interface DeleteAuthenticationCommandOptions {
  tenant: Tenant;
  environment: string;
  baseUrl: string;
  connectorId: string;
  usage: AuthenticationUsage;
}

export async function runDeleteAuth(
  options: DeleteAuthenticationCommandOptions
): Promise<void> {
  startCommand('delete-auth', { options });

  const accessToken = isDryRun()
    ? 'Bearer Token'
    : await readAccessToken(options.tenant);

  const { baseUrl, environment, connectorId, usage } = options;

  info('Retrieving connector...');
  const { id, name } = isDryRun()
    ? { id: connectorId, name: 'DryRunConnector' }
    : await getConnectorById({
        baseUrl: buildRequestUrl(baseUrl, environment),
        connectorId,
        token: accessToken,
      });

  info('Removing connector authentication...');
  await removeConnectorAuthentication(
    baseUrl,
    environment,
    id,
    usage,
    name,
    accessToken
  );
}
