import { getConnectorById } from '../../../common/get-connector';
import {
  httpErrorHandler,
  info,
  logRequest,
  success,
} from '../../../core';

export interface PatchConnectorPayload {
  enabled?: boolean;
  default?: boolean;
  name?: string;
}

export async function patchConnector(
  connectorEndpointBaseUrl: string,
  connectorId: string,
  token: string,
  payload: PatchConnectorPayload
): Promise<void> {
  info('Retrieving connector to update...');
  const { id, name } = await getConnectorById({
    baseUrl: connectorEndpointBaseUrl,
    connectorId,
    token,
  });

  info('Updating connector...');
  const patchEndpoint = `${connectorEndpointBaseUrl}/${id}`;

  logRequest(patchEndpoint, payload);

  const res = await fetch(patchEndpoint, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await httpErrorHandler(res);
  }

  // API returns empty body on success by design
  const displayName = payload.name ?? name;
  success(`Connector "${displayName}" is updated`, { id, name: displayName });
}
