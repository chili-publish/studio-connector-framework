import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { httpErrorHandler, info, success, verbose, warn } from '../../../core';
import { UpdateConnectorPayload } from '../types';

export async function updateExistingConnector(
  connectorEndpointBaseUrl: string,
  connectorId: string,
  token: string,
  payload: UpdateConnectorPayload
): Promise<void> {
  info('Updating connector...');
  const getConnectorEnpdoint = `${connectorEndpointBaseUrl}/${connectorId}`;

  verbose(
    `Checking connector's existing with id ${connectorId} -> ${getConnectorEnpdoint}`
  );
  const existingConnectorRes = await fetch(getConnectorEnpdoint, {
    headers: {
      Authorization: token,
    },
  });
  if (existingConnectorRes.status !== 200) {
    warn(
      `Connector with id ${connectorId} doesn't exist or you don't have permission to update it`
    );
    // When connector is not available we request the list and ask user to select connector for update
    const id = await getConnectorForUpdate(connectorEndpointBaseUrl, token);
    return updateExistingConnector(
      connectorEndpointBaseUrl,
      id,
      token,
      payload
    );
  }

  const existingConnector = await existingConnectorRes.json();
  const updatePayload = {
    ...existingConnector,
    ...payload,
  };

  const updateConnectorEnpdoint = getConnectorEnpdoint;

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

async function getConnectorForUpdate(
  connectorEndpointBaseUrl: string,
  token: string
): Promise<string> {
  info(`Requesting the list of available connectors...`);
  const connectorsRes = await fetch(connectorEndpointBaseUrl, {
    headers: {
      Authorization: token,
    },
  });

  info(
    `Received the list of available connectors. Please select the one you want to update:`
  );
  const { data: connectors } = await connectorsRes.json();
  console.table(connectors, ['id', 'name']);

  const rl = readline.createInterface({ input, output });

  let connectorIndex;

  while (true) {
    // Use the question method to get the user input
    const index = Number(
      await rl.question('Select the index of the connector to update ')
    );
    // Use the validation function to check the input
    if (isNaN(index) || !connectors[index]) {
      warn(`Index should be a number between 0 and ${connectors.length - 1}`);
    } else {
      connectorIndex = index;
      break;
    }
  }

  rl.close();

  return connectors[connectorIndex].id;
}
