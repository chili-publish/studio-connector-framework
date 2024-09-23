import { getConnectorById } from '../../../common/get-connector';
import { httpErrorHandler, info, success, verbose } from '../../../core';
import { UpdateConnectorPayload } from '../types';

export async function updateExistingConnector(
  connectorEndpointBaseUrl: string,
  connectorId: string,
  token: string,
  payload: UpdateConnectorPayload
): Promise<void> {
  info('Updating connector...');
  const existingConnector = await getConnectorById({
    baseUrl: connectorEndpointBaseUrl,
    connectorId,
    token,
  });
  const updatePayload = {
    ...existingConnector,
    ...payload,
  };

  const updateConnectorEnpdoint = `${connectorEndpointBaseUrl}/${connectorId}`;

  verbose(
    `Deploying connector with a payload\n ${JSON.stringify(
      updatePayload,
      null,
      2
    )}\n`
  );

  verbose('Updating connector to -> ' + updateConnectorEnpdoint);

  const res = await fetch(updateConnectorEnpdoint, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: JSON.stringify(updatePayload),
  });

  if (!res.ok) {
    await httpErrorHandler(res);
  }

  const data = await res.json();
  verbose(`Updated connector payload: \n ${JSON.stringify(data, null, 2)}\n`);

  const result = {
    id: data.id,
    name: data.name,
  };

  success(`Connector "${result.name}" is updated`, result);
}
