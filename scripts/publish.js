const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');

/*
    This script is used to build and publish the connectors to the publish folder.
    It will:
    - Build the connector
    - Extract the connector info
    - Create a JSON file with the connector info
    - Write the JSON file to the publish folder
*/

const repoRoot = findRepoRoot(__dirname);

const connectorsDir = path.join(repoRoot, 'src', 'connectors');
fs.readdir(connectorsDir, (err, files) => {
  if (err) {
    console.error(err);
    return;
  }
  files.forEach(file => {
    const dirPath = path.join(connectorsDir, file);
    if (fs.statSync(dirPath).isDirectory()) {
      processConnector(dirPath);
    }
  });
});

function processConnector(dir) {
  // Build the project
  execSync('yarn build', {cwd: dir, stdio: 'inherit'});

  // Validate the out folder contains a connector.js file
  const outDir = path.join(dir, 'out');
  if (
    !fs.existsSync(outDir) ||
    !fs.existsSync(path.join(outDir, 'connector.js'))
  ) {
    console.error(`connector.js does not exist in ${outDir}`);
    return;
  }

  // Read the package.json and extract the necessary info
  const packageJson = require(path.join(dir, 'package.json'));
  const {name, description, version, config, license, author} = packageJson;

  // Read the connector.js file
  const {connectorJs, connectorTs} = readScripts(outDir, dir);

  // get connector sdk version
  const connectorApiVersion = extractConnectorSdkVersion(packageJson);

  // Build the project
  const connectorInfo = extractConnectorInfo(outDir);

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

  // Write the JSON object to <repo root>/publish/<name>.json
  const publishDir = path.join(__dirname, '..', 'publish');
  if (!fs.existsSync(publishDir)) {
    fs.mkdirSync(publishDir);
  }
  fs.writeFileSync(
    path.join(publishDir, `${name}.${version}.json`),
    JSON.stringify(jsonObject, null, 2),
  );
  console.log(`Successfully processed ${name}`);
}

function extractConnectorSdkVersion(packageJson) {
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

function findRepoRoot(startPath) {
  let currentPath = startPath;
  while (!fs.existsSync(path.join(currentPath, 'package.json'))) {
    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      throw new Error('Root package.json not found');
    }
    currentPath = parentPath;
  }
  return currentPath;
}

function readScripts(outDir, dir) {
  const connectorJs = fs.readFileSync(
    path.join(outDir, 'connector.js'),
    'utf-8',
  );
  const connectorTs = fs.existsSync(path.join(dir, 'connector.ts'))
    ? fs.readFileSync(path.join(dir, 'connector.ts'), 'utf-8')
    : undefined;
  return {connectorJs, connectorTs};
}

function extractConnectorInfo(outDir) {
  const infoCommand =
    'yarn run connector-cli info  -o ' +
    path.join(outDir, 'props.json') +
    ' ' +
    path.join(outDir, 'connector.js');
  console.log(infoCommand);

  execSync(infoCommand, {cwd: repoRoot});

  const infoOutput = fs.readFileSync(path.join(outDir, 'props.json'));
  const connectorInfo = JSON.parse(infoOutput);
  return connectorInfo;
}
