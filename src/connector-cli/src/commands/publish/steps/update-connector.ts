import { getConnectorById } from '../../../common/get-connector';
import {
  httpErrorHandler,
  info,
  isDryRun,
  logRequest,
  success,
  verbose,
} from '../../../core';
import { UpdateConnectorPayload } from '../types';

export async function updateExistingConnector(
  connectorEndpointBaseUrl: string,
  connectorId: string,
  token: string,
  payload: UpdateConnectorPayload
): Promise<void> {
  info('Retrieving connector to update...');
  const existingConnector = isDryRun()
    ? { id: connectorId }
    : await getConnectorById({
        baseUrl: connectorEndpointBaseUrl,
        connectorId,
        token,
      });
  const updatePayload = {
    ...existingConnector,
    ...payload,
  };

  info('Updating connector...');
  const updateConnectorEnpdoint = `${connectorEndpointBaseUrl}/${existingConnector.id}`;

  logRequest(updateConnectorEnpdoint, updatePayload);

  if (!isDryRun()) {
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
  } else {
    success(`Connector "${payload.name}" is updated`);
  }
}
