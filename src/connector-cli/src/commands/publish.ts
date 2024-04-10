import * as fs from 'fs';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { compileToTempFile } from '../compiler/connectorCompiler';
import {
  validateInputConnectorFile,
  validateRuntimeOptions,
} from '../validation';
import path from 'path';
import dot from 'dot-object';
import {
  errorNoColor,
  info,
  success,
  verbose,
  warn,
  error,
  startCommand,
} from '../logger';
import { getAuthService } from '../authentication';
import { getInstalledPackageVersion } from '../utils/version-reader';

interface PublishCommandOptions {
  tenant: 'dev' | 'prod';
  baseUrl: string;
  environment: string;
  name: string;
  connectorId?: string;
  runtimeOption?: Record<string, unknown>;
  ['proxyOption.allowedDomains']?: Array<string>;
  ['proxyOption.forwardedHeaders']?: true;
}

interface ProxyOptions {
  allowedDomains: Array<string>;
  forwardedHeaders: true;
}

interface ConnectorPayload {
  name: string;
  description: string;
  type: 'media' | 'fonts';
  version: string;
  iconUrl: string;
  script: string;
  apiVersion: string;
  allowedDomains: Array<string>;
  proxyOptions: {
    forwardedHeaders: boolean;
  };
}

interface CreateConnectorPayload extends ConnectorPayload {
  enabled: true;
}

type UpdateConnectorPayload = ConnectorPayload;

export async function runPublish(
  connectorFile: string,
  options: PublishCommandOptions
): Promise<void> {
  startCommand('publish', { connectorFile, options });
  if (!validateInputConnectorFile(connectorFile)) {
    throw new Error('Invalid connector file path: ' + connectorFile);
  }

  const authService = getAuthService(options.tenant);

  if (!(await authService.isAuthenticated())) {
    warn('Please login first by "connector-cli login" command');
    return;
  }

  const accessToken = authService.sessionStorage.accessToken;

  // store all options as vars
  const {
    baseUrl,
    environment,
    name,
    connectorId,
    runtimeOption: runtimeOptions,
    ...rawProxyOptions
  } = options;

  const proxyOptions: Partial<ProxyOptions> =
    (dot.object(rawProxyOptions) as any)?.['proxyOption'] ?? {};

  const dir = path.dirname(path.resolve(connectorFile));

  // Read the package.json and extract the necessary info
  const packageJson = require(path.join(dir, 'package.json'));

  const errors = validateRuntimeOptions(
    runtimeOptions,
    packageJson.config.options
  );
  if (errors.length > 0) {
    error(
      `${JSON.stringify(
        errors,
        null,
        2
      )}.\n To see all available options execute 'connector-cli pathToConnector list-options --type="runtime-options"'`
    );
    return;
  }

  info('Building connector...');

  // Compile connector
  const compilation = await compileToTempFile(connectorFile);

  if (compilation.errors.length > 0) {
    errorNoColor(compilation.formattedDiagnostics);
    return;
  } else {
    success('Build succeeded -> ' + compilation.tempFile);
  }

  const { description, version, config } = packageJson;

  // Read the connector.js file
  const { connectorJs, connectorTs } = {
    connectorJs: fs.readFileSync(path.resolve(compilation.tempFile), 'utf8'),
    connectorTs: fs.readFileSync(path.resolve(connectorFile), 'utf8'),
  };

  // get connector sdk version
  const apiVersion = getInstalledPackageVersion(
    '@chili-publish/studio-connectors',
    dir
  );

  // Retrieve capabilities and configurationOptions of the connector
  // const connectorInfo = await getInfoInternal(compilation);

  const connectorEndpointBaseUrl = new URL(baseUrl);
  if (!connectorEndpointBaseUrl.pathname.endsWith('/')) {
    connectorEndpointBaseUrl.pathname += '/';
  }
  connectorEndpointBaseUrl.pathname += `api/experimental/environment/${environment}/connectors`;

  const connectorPayload = {
    name,
    description,
    version,
    type: config.type,
    iconUrl: config.iconUrl,
    options: runtimeOptions,
    script: connectorJs,
    apiVersion,
    allowedDomains: proxyOptions.allowedDomains ?? ['*'],
    proxyOptions: {
      forwardedHeaders: !!proxyOptions.forwardedHeaders,
    },
  };
  const errorHandler = async (res: Response) => {
    try {
      const errorData = await res.json();
      verbose(
        'Error during publishing: \n' + JSON.stringify(errorData, null, 2)
      );
    } catch (e) {
      verbose('Error during publishing: ' + res.statusText);
    } finally {
      error(
        `Something went wrong during publishing of the connector "${name}". Run command with -v for more information`
      );
    }
  };
  let publishResult = false;
  if (connectorId) {
    publishResult = await updateExistingConnector(
      errorHandler,
      connectorEndpointBaseUrl.href,
      connectorId,
      `${accessToken?.token.token_type} ${accessToken?.token.access_token}`,
      connectorPayload
    );
  } else {
    publishResult = await createNewConnector(
      errorHandler,
      connectorEndpointBaseUrl.href,
      `${accessToken?.token.token_type} ${accessToken?.token.access_token}`,
      { ...connectorPayload, enabled: true }
    );
  }

  if (publishResult) {
    success(`Connector "${name}" is deployed`);
  }
}

async function createNewConnector(
  err: (res: Response) => Promise<void>,
  connectorEndpointBaseUrl: string,
  token: string,
  creationPayload: CreateConnectorPayload
): Promise<boolean> {
  const createConnectorEndpoint = connectorEndpointBaseUrl;

  verbose(
    `Deploying connector with a payload\n ${JSON.stringify(
      creationPayload,
      null,
      2
    )}\n`
  );

  info('Deploying connector -> ' + createConnectorEndpoint);

  const res = await fetch(createConnectorEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: JSON.stringify(creationPayload),
  });

  if (res.status !== 201) {
    await err(res);
    return false;
  }

  const data = await res.json();
  verbose(`Created connector payload:\n ${JSON.stringify(data, null, 2)}\n`);
  return true;
}

async function updateExistingConnector(
  err: (res: Response) => Promise<void>,
  connectorEndpointBaseUrl: string,
  connectorId: string,
  token: string,
  payload: UpdateConnectorPayload
): Promise<boolean> {
  const getConnectorEnpdoint = `${connectorEndpointBaseUrl}/${connectorId}`;

  info(
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
      err,
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

  info('Updating connector -> ' + updateConnectorEnpdoint);

  const res = await fetch(updateConnectorEnpdoint, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: JSON.stringify(updatePayload),
  });

  if (res.status !== 200) {
    await err(res);
    return false;
  }

  const data = await res.json();
  verbose(`Updated connector payload: \n ${JSON.stringify(data, null, 2)}\n`);
  return true;
}

async function getConnectorForUpdate(
  connectorEndpointBaseUrl: string,
  token: string
): Promise<string> {
  info(`Requesting list of available connectors...`);
  const connectorsRes = await fetch(connectorEndpointBaseUrl, {
    headers: {
      Authorization: token,
    },
  });

  info(
    `Here are the list of available connectors. Select the one you want to update`
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
