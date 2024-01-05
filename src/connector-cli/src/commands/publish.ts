import * as fs from 'fs';
import { compileToTempFile } from '../compiler/connectorCompiler';
import { validateInputConnectorFile } from '../validation';
import { DataStore } from '../authentication';
import path from 'path';
import { getInfoInternal } from './info';
import {
  errorNoColor,
  info,
  success,
  verbose,
  warn,
  error,
  startCommand,
} from '../logger';

// yarn connector-cli publish -e cp-dyx-217 -b https://devblubird.cpstaging.online/grafx -n Acquia ./src/connectors/acquia/connector.ts
// yarn connector-cli publish -e admin -b http://localhost:8081 -n Acquia ./src/connectors/acquia/connector.ts
export async function runPublish(
  connectorFile: string,
  options: any
): Promise<void> {
  startCommand('publish', { connectorFile, options });
  if (!validateInputConnectorFile(connectorFile)) {
    throw new Error('Invalid connector file path: ' + connectorFile);
  }

  const isAuthenticated = await DataStore.isAuthenticated();
  if (!isAuthenticated) {
    warn('Please login first');
    return;
  }

  const accessToken = DataStore.accessToken;

  // store all options as vars
  const { baseUrl, environment, name, overwrite } = options;

  info('Building connector...');

  // Compile connector
  const compilation = await compileToTempFile(connectorFile);

  if (compilation.errors.length > 0) {
    errorNoColor(compilation.formattedDiagnostics);
    return;
  } else {
    success('Build succeeded -> ' + compilation.tempFile);
  }

  const dir = path.dirname(path.resolve(connectorFile));

  // Read the package.json and extract the necessary info
  const packageJson = require(path.join(dir, 'package.json'));
  const {
    name: packageName,
    description,
    version,
    config,
    license,
    author,
  } = packageJson;

  // Read the connector.js file
  const { connectorJs, connectorTs } = {
    connectorJs: fs.readFileSync(compilation.tempFile, 'utf8'),
    connectorTs: fs.readFileSync(connectorFile, 'utf8'),
  };

  // get connector sdk version
  const connectorApiVersion = extractConnectorSdkVersion(dir, packageJson);

  // Retrieve capabilities and configurationOptions of the connector
  const connectorInfo = await getInfoInternal(compilation);

  // Create a new JSON object
  const creationPayload = {
    name,
    description,
    version,
    enabled: true,
    // packageName,
    // license,
    // author,
    script: connectorJs,
    scriptTs: connectorTs,
    connectorApiVersion,
  };

  // Object.assign(jsonObject, config);
  // Object.assign(jsonObject, connectorInfo);

  const createConnectorEndpoint = `${baseUrl}/api/experimental/environment/${environment}/connectors`;

  verbose(`Deploying connector with a payload ${creationPayload}`);

  info('Deploying connector -> ' + createConnectorEndpoint);

  const res = await fetch(createConnectorEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `${accessToken?.token.token_type} ${accessToken?.token.access_token}`,
    },
    body: JSON.stringify(creationPayload),
  });

  if (res.status !== 201) {
    try {
      const errorData = await res.json();
      verbose('Error during publishing: ' + JSON.stringify(errorData));
    } catch (e) {
      verbose('Error during publishing: ' + res.statusText);
    } finally {
      error(
        `Something went wrong during publishing of the connector "${name}". Run command with -v for more information`
      );
      return;
    }
  }

  const data = (await res.json()) as { id: string };
  verbose(`Created connector payload: ${JSON.stringify(data)}`);
  success(`Connector "${name}" is published`);
}

function extractConnectorSdkVersion(dir: string, packageJson: any) {
  // in the package.json get the version of the @chili-publish/studio-connectors package
  const studioConnectorsVersion =
    packageJson.dependencies['@chili-publish/studio-connectors'];
  if (!studioConnectorsVersion) {
    error(
      `@chili-publish/studio-connectors not found in ${path.join(
        dir,
        'package.json'
      )}`
    );
    return;
  }

  let connectorApiVersion = '';

  // the dependency could be a version, or tarball
  if (studioConnectorsVersion.startsWith('file:')) {
    // get the tarball name
    const tarball = studioConnectorsVersion.replace('file:', '');
    // regex matchh version number
    const regex = /v([0-9]+\.[0-9]+\.[0-9]+)\.tgz/;
    const match = regex.exec(tarball);
    if (!match) {
      console.error(`Failed to extract version from ${tarball}`);
      return;
    }
    connectorApiVersion = match[1];
  } else {
    // regex matchh version number
    const regex = /([0-9]+\.[0-9]+\.[0-9]+)/;
    const match = regex.exec(studioConnectorsVersion);
    if (!match) {
      error(`Failed to extract version from ${studioConnectorsVersion}`);
      return;
    }
    connectorApiVersion = match[1];
  }

  return connectorApiVersion;
}
