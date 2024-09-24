const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/*
    This script is used to build and publish the connectors to the "publish" folder.
    We use the content of "publish" folder to deploy to marketplace
    It will:
    - Build the connector
    - Extract the connector info
    - Create a JSON file with the connector info
    - Write the JSON file to the "publish" folder
*/

const repoRoot = findRepoRoot(__dirname);

console.log(`Found repo root at ${repoRoot}`);

const connectorsToProcess = process.argv.slice(2);
connectorsToProcess.forEach(file => {
  const dirPath = path.join(repoRoot, 'src', 'connectors', file);
  console.log(`Checking ${dirPath}`);

  if (fs.statSync(dirPath).isDirectory()) {
    console.log(`Processing ${dirPath}`);
    const connectorJson = processConnector(dirPath);
    // Write the JSON object to <repo root>/publish/<name>.json
    const publishDir = path.join(repoRoot, 'publish');
    if (!fs.existsSync(publishDir)) {
      fs.mkdirSync(publishDir);
    }
    fs.writeFileSync(
      path.join(publishDir, `${connectorJson.id}.${connectorJson.version}.json`),
      JSON.stringify(connectorJson, null, 2),
    );
    console.log(`Successfully processed ${connectorJson.name}`);
  } else {
    console.log(`${dirPath} is not a directory. Skipping.`);
  }
});

console.log('Finished processing connectors');
console.log('Creating index.json');
// create index.json file based on contents of publish folder
const publishDir = path.join(repoRoot, 'publish');
const existingDir = path.join(repoRoot, 'existing');
const indexJson = fs.existsSync(path.join(existingDir, 'index.json'))
  ? JSON.parse(fs.readFileSync(path.join(existingDir, 'index.json')))
  : {};

fs.readdirSync(publishDir).forEach(file => {
  //check if json then read and add to index
  if (file.endsWith('.json')) {
    const connectorDetails = JSON.parse(
      fs.readFileSync(path.join(publishDir, file)),
    );
    const { id, name } = connectorDetails;
    const connectorAuthor = connectorDetails.author.name;
    const connectorType = connectorDetails.type;
    const connectorDescription = connectorDetails.description;
    const connectorIconUrl = connectorDetails.logoUrl;
    const connectorVersion = connectorDetails.version;

    if (!indexJson[id]) {
      indexJson[id] = {versions: []};
    }
    indexJson[id].name = name ?? packageName;
    indexJson[id].author = connectorAuthor;
    indexJson[id].type = connectorType;
    indexJson[id].description = connectorDescription;
    indexJson[id].logoUrl = connectorIconUrl;

    if (indexJson[id].versions.includes(connectorVersion)) {
      return;
    }
    indexJson[id].versions.push(connectorVersion);
  }
});

fs.writeFileSync(
  path.join(publishDir, 'index.json'),
  JSON.stringify(indexJson, null, 2),
);

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
  const { name, description, version, author } = packageJson;

  // Read the connector.js file
  const { connectorJs } = readScripts(outDir, dir);

  // Build the project
  const connectorInfo = extractConnectorInfo(outDir, dir);

  // Create a new JSON object
  const jsonObject = {
    id: name,
    name: packageJson.config.connectorName || name,
    description,
    version,
    author,
    script: connectorJs,
    authenticationConfig: packageJson.config.authenticationConfig
  };

  Object.assign(jsonObject, connectorInfo);

  return jsonObject;
}


function extractConnectorInfo(outDir, inputDir) {
  const infoCommand =
    'yarn run connector-cli info  -o ' +
    path.join(outDir, 'props.json') +
    ' ' +
    path.join(inputDir, 'connector.ts');
  console.log(infoCommand);

  execSync(infoCommand, {cwd: repoRoot});

  const infoOutput = fs.readFileSync(path.join(outDir, 'props.json'));
  const connectorInfo = JSON.parse(infoOutput);
  return connectorInfo;
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
  return { connectorJs, connectorTs };
}