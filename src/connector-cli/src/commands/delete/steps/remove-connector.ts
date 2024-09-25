import { getConnectorById } from '../../../common/get-connector';
import { httpErrorHandler, info, success, verbose } from '../../../core';

export async function removeConnector(
  connectorEndpointBaseUrl: string,
  connectorId: string,
  token: string
): Promise<void> {
  info('Retrieving connector to remove...');
  const { id, name } = await getConnectorById({
    baseUrl: connectorEndpointBaseUrl,
    connectorId,
    token,
  });

  info('Removing connector...');
  const deleteConnectorEnpdoint = `${connectorEndpointBaseUrl}/${id}`;

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

  success(`Connector "${name}" is removed`, { id, name });
}
