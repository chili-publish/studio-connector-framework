import { stdin as input, stdout as output } from 'node:process';
import * as readline from 'node:readline/promises';
import { httpErrorHandler, info, warn } from '../core';

export async function selectAvailableConnector(
  connectorEndpointBaseUrl: string,
  token: string
): Promise<string> {
  info(`Requesting the list of available connectors...`);
  const res = await fetch(connectorEndpointBaseUrl, {
    headers: {
      Authorization: token,
    },
  });

  if (!res.ok) {
    await httpErrorHandler(res);
  }

  info(
    `Received the list of available connectors. Please select the one you want to make an action with:`
  );
  const { data: connectors } = await res.json();
  console.table(connectors, ['id', 'name']);

  const rl = readline.createInterface({ input, output });

  let connectorIndex;

  while (true) {
    // Use the question method to get the user input
    const index = Number(
      await rl.question(
        'Select the index of the connector to make an action:\xa0'
      )
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
