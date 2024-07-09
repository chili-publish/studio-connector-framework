import { selectAvailableConnector } from '../../../common/select-available-connector';
import { httpErrorHandler, info, success, verbose, warn } from '../../../core';

export async function removeConnector(
  connectorEndpointBaseUrl: string,
  connectorId: string,
  token: string
): Promise<void> {
  info('Removing connector...');
  const deleteConnectorEnpdoint = `${connectorEndpointBaseUrl}/${connectorId}`;

  verbose('Removing connector via -> ' + deleteConnectorEnpdoint);

  const res = await fetch(deleteConnectorEnpdoint, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
  });

  if (!res.ok && res.status === 404) {
    warn(
      `Connector with id ${connectorId} doesn't exist or you don't have permission to remove it`
    );
    const id = await selectAvailableConnector(connectorEndpointBaseUrl, token);
    return removeConnector(connectorEndpointBaseUrl, id, token);
  } else if (!res.ok) {
    await httpErrorHandler(res);
  }

  success(`Connector "${connectorId}" is removed`);
}
