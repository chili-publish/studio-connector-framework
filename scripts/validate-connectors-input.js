const fs = require('fs');
const path = require('path');

/*
  This script validates the connectors input JSON and returns connector metadata.
  Input: JSON object where keys are connector keys and values are arrays of versions.
  Output: JSON object with connector IDs and versions for each connector key.
*/

const repoRoot = findRepoRoot(__dirname);

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

function validateConnectorsInput(connectorsInput) {
  // Parse JSON
  let connectorsObj;
  try {
    connectorsObj = typeof connectorsInput === 'string'
      ? JSON.parse(connectorsInput)
      : connectorsInput;
  } catch (error) {
    throw new Error(`Invalid JSON format: ${error.message}`);
  }

  // Validate it's an object
  if (typeof connectorsObj !== 'object' || Array.isArray(connectorsObj) || connectorsObj === null) {
    throw new Error('Input must be a JSON object');
  }

  const result = {};
  const connectorsDir = path.join(repoRoot, 'src', 'connectors');

  // Validate each connector
  for (const [connectorKey, versions] of Object.entries(connectorsObj)) {
    if (!connectorKey || typeof connectorKey !== 'string') {
      throw new Error('Connector key cannot be empty');
    }

    if (!Array.isArray(versions)) {
      throw new Error(`Versions for connector '${connectorKey}' must be an array`);
    }

    if (versions.length === 0) {
      throw new Error(`Versions array for connector '${connectorKey}' cannot be empty`);
    }

    // Validate versions are strings
    for (const version of versions) {
      if (typeof version !== 'string' || !version.trim()) {
        throw new Error(`Invalid version format for connector '${connectorKey}': versions must be non-empty strings`);
      }
    }

    // Check connector directory exists
    const connectorDir = path.join(connectorsDir, connectorKey);
    if (!fs.existsSync(connectorDir) || !fs.statSync(connectorDir).isDirectory()) {
      throw new Error(`Connector '${connectorKey}' not found in src/connectors/`);
    }

    // Read package.json to get connector ID
    const packageJsonPath = path.join(connectorDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error(`package.json not found for connector '${connectorKey}'`);
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const connectorId = packageJson.name;

    if (!connectorId) {
      throw new Error(`package.json for connector '${connectorKey}' is missing 'name' field`);
    }

    result[connectorKey] = {
      connectorId,
      versions,
    };
  }

  return result;
}

// Main execution
const connectorsInput = process.argv[2];

if (!connectorsInput) {
  console.error('Error: Connectors input JSON is required');
  process.exit(1);
}

try {
  const validated = validateConnectorsInput(connectorsInput);
  console.log(JSON.stringify(validated, null, 2));
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
