import { httpErrorHandler, verbose, warn } from '../core';
import { ExecutionError } from '../core/types';
import { selectAvailableConnector } from './select-available-connector';

interface GetConnectorById {
  baseUrl: string;
  connectorId: string;
  token: string;
}

interface EnvironmentConnector {
  id: string;
  name: string;
  ownerType: 'grafx';
  externalSourceId?: string;
}

export async function getConnectorById(
  request: GetConnectorById
): Promise<EnvironmentConnector> {
  const getConnectorEnpdoint = `${request.baseUrl}/${request.connectorId}`;

  verbose(
    `Checking connector's existing with id ${request.connectorId} -> ${getConnectorEnpdoint}`
  );
  const res = await fetch(getConnectorEnpdoint, {
    headers: {
      Authorization: request.token,
    },
  });

  if (!res.ok && res.status === 404) {
    warn(
      `Connector with id ${request.connectorId} doesn't exist or you don't have permission to view it`
    );
    // When particular connector is not available we request the full list and ask user to select one available to make an action
    const id = await selectAvailableConnector(request.baseUrl, request.token);
    return getConnectorById({ ...request, connectorId: id });
  } else if (!res.ok) {
    await httpErrorHandler(res);
  }

  const connector: EnvironmentConnector = await res.json();

  verbose('Checking belongings to "Hub-Based" connectors');
  if (connector.ownerType === 'grafx' && !!connector.externalSourceId) {
    throw new ExecutionError(
      `You're trying to change a connector created using Connector Hub. It can not be done via Connector CLI. Consider to use GraFx Platform connectors configuration page instead`
    );
  }
  return connector;
}
