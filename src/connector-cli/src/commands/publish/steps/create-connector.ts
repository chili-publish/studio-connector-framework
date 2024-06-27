import { httpErrorHandler, info, success, verbose } from '../../../core';
import { CreateConnectorPayload } from '../types';

export async function createNewConnector(
  connectorEndpointBaseUrl: string,
  token: string,
  creationPayload: CreateConnectorPayload
): Promise<void> {
  info('Creating a new connector...');
  const createConnectorEndpoint = connectorEndpointBaseUrl;

  verbose(
    `Deploying connector with a payload\n ${JSON.stringify(
      creationPayload,
      null,
      2
    )}\n`
  );

  verbose('Deploying connector to -> ' + createConnectorEndpoint);

  const res = await fetch(createConnectorEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: JSON.stringify(creationPayload),
  });

  if (!res.ok) {
    await httpErrorHandler(res);
  }

  const data = await res.json();
  verbose(`Created connector payload:\n ${JSON.stringify(data, null, 2)}\n`);
  const result = {
    id: data.id,
    name: data.name,
  };

  success(`Connector "${result.name}" is created`, result);
}
