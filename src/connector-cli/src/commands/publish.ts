import * as fs from 'fs';
import { compileToTempFile } from '../compiler/connectorCompiler';
import { validateInputConnectorFile } from '../validation';
import { DataStore } from '../authentication';
import path from 'path';
import { getInfoInternal } from './info';

export async function runPublish(
  connectorFile: string,
  options: any
): Promise<void> {
  if (!validateInputConnectorFile(connectorFile)) {
    return;
  }

  if (!DataStore.isAuthenticated()) {
    console.log('Please login first');
    return;
  }

  // store all options as vars
  const { token, endpoint, name, overwrite } = options;

  // first build using tsc
  console.log('Building connector...');

  const compilation = await compileToTempFile(connectorFile);

  if (compilation.errors.length > 0) {
    console.log('Build failed');
    return;
  }

  console.log('Build succeeded');

  const dir = path.dirname(path.resolve(connectorFile));

  // Read the package.json and extract the necessary info
  const packageJson = require(path.join(dir, 'package.json'));
  const {name: packageName, description, version, config, license, author} = packageJson;

  // Read the connector.js file
  const {connectorJs, connectorTs} = {connectorJs: fs.readFileSync(compilation.tempFile, 'utf8'), connectorTs: fs.readFileSync(connectorFile, 'utf8')};

  // get connector sdk version
  const connectorApiVersion = extractConnectorSdkVersion(dir, packageJson);

  // Build the project
  const connectorInfo = getInfoInternal(compilation);

  // Create a new JSON object
  const jsonObject = {
    name,
    description,
    version,
    license,
    author,
    script: connectorJs,
    scriptTs: connectorTs,
    connectorApiVersion,
  };

  Object.assign(jsonObject, config);
  Object.assign(jsonObject, connectorInfo);

  console.log('Publishing connector => ' + JSON.stringify(jsonObject));
}

function extractConnectorSdkVersion(dir: string, packageJson: any) {
  // in the package.json get the version of the @chili-publish/studio-connectors package
  const studioConnectorsVersion =
    packageJson.dependencies['@chili-publish/studio-connectors'];
  if (!studioConnectorsVersion) {
    console.error(
      `@chili-publish/studio-connectors not found in ${path.join(
        dir,
        'package.json',
      )}`,
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
      console.error(
        `Failed to extract version from ${studioConnectorsVersion}`,
      );
      return;
    }
    connectorApiVersion = match[1];
  }

  return connectorApiVersion;
}
