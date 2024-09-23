import { getConnectorById } from '../../../common/get-connector';
import { httpErrorHandler, info, success, verbose } from '../../../core';

export async function removeConnector(
  connectorEndpointBaseUrl: string,
  connectorId: string,
  token: string
): Promise<void> {
  info('Removing connector...');
  const deleteConnectorEnpdoint = `${connectorEndpointBaseUrl}/${connectorId}`;

  await getConnectorById({
    baseUrl: connectorEndpointBaseUrl,
    connectorId,
    token,
  });

  verbose('Removing connector via -> ' + deleteConnectorEnpdoint);

  const res = await fetch(deleteConnectorEnpdoint, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
  });

  if (!res.ok) {
    await httpErrorHandler(res);
  }

  success(`Connector "${connectorId}" is removed`);
}
