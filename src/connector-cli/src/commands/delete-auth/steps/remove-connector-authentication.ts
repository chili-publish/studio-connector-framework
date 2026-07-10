import {
  httpErrorHandler,
  isDryRun,
  logRequest,
  success,
  verbose,
} from '../../../core';
import { buildRequestUrl } from '../../../common/build-request-url';
import { AuthenticationUsage } from '../../set-auth/types';

export async function removeConnectorAuthentication(
  baseUrl: string,
  environment: string,
  connectorId: string,
  usage: AuthenticationUsage,
  connectorName: string,
  token: string
): Promise<void> {
  const connectorsBase = buildRequestUrl(baseUrl, environment);
  const authResourceUrl = new URL(
    `${connectorsBase}/${connectorId}/auth`
  );
  authResourceUrl.searchParams.set('authUsage', usage);

  const requestUrl = authResourceUrl.toString();
  logRequest(requestUrl, { usage });

  if (isDryRun()) {
    success(`Authentication removed for "${connectorName}"`, {
      id: connectorId,
      name: connectorName,
      usage,
    });
    return;
  }

  verbose('Removing connector authentication via -> ' + requestUrl);

  const res = await fetch(requestUrl, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
  });

  if (!res.ok) {
    await httpErrorHandler(res);
  }

  success(`Authentication removed for "${connectorName}"`, {
    id: connectorId,
    name: connectorName,
    usage,
  });
}
