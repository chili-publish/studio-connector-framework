const fs = require('fs');
const path = require('path');

/*
  This script updates the connector index.json file with new connector versions.
  It reads connector files from a directory and merges them into the existing index.
  Similar to how publish.js updates index.json, but for existing connector files.
*/

function updateIndex(connectorFilesDir, indexFilePath) {
  // Read existing index or create empty one
  let indexJson = {};
  if (fs.existsSync(indexFilePath)) {
    const indexContent = fs.readFileSync(indexFilePath, 'utf-8');
    if (indexContent.trim()) {
      indexJson = JSON.parse(indexContent);
    }
  }

  // Process each connector file
  if (!fs.existsSync(connectorFilesDir)) {
    throw new Error(`Connector files directory does not exist: ${connectorFilesDir}`);
  }

  const files = fs.readdirSync(connectorFilesDir);
  const jsonFiles = files.filter(file => file.endsWith('.json') && file !== 'index.json');

  if (jsonFiles.length === 0) {
    console.log('No connector files found to update index');
    return indexJson;
  }

  for (const file of jsonFiles) {
    const filePath = path.join(connectorFilesDir, file);
    const connectorData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    const {
      id: connectorId,
      name,
      version: connectorVersion,
      type: connectorType,
      description: connectorDescription,
      logoUrl: connectorIconUrl,
    } = connectorData;

    const connectorAuthor = connectorData.author?.name || '';

    if (!connectorId) {
      console.warn(`Warning: Skipping ${file} - missing 'id' field`);
      continue;
    }

    if (!connectorVersion) {
      console.warn(`Warning: Skipping ${file} - missing 'version' field`);
      continue;
    }

    // Initialize connector entry if it doesn't exist
    if (!indexJson[connectorId]) {
      indexJson[connectorId] = { versions: [] };
    }

    // Update connector metadata (always update to latest values)
    indexJson[connectorId].name = name || connectorId;
    indexJson[connectorId].author = connectorAuthor;
    indexJson[connectorId].type = connectorType;
    indexJson[connectorId].description = connectorDescription;
    indexJson[connectorId].logoUrl = connectorIconUrl;

    // Add version if it doesn't exist
    if (!indexJson[connectorId].versions.includes(connectorVersion)) {
      indexJson[connectorId].versions.push(connectorVersion);
      console.log(`Added version ${connectorVersion} to ${connectorId}`);
    } else {
      console.log(`Version ${connectorVersion} already exists for ${connectorId}`);
    }
  }

  return indexJson;
}

// Main execution
const connectorFilesDir = process.argv[2];
const indexFilePath = process.argv[3];

if (!connectorFilesDir) {
  console.error('Error: Connector files directory is required');
  process.exit(1);
}

if (!indexFilePath) {
  console.error('Error: Index file path is required');
  process.exit(1);
}

try {
  const updatedIndex = updateIndex(connectorFilesDir, indexFilePath);
  fs.writeFileSync(indexFilePath, JSON.stringify(updatedIndex, null, 2));
  console.log(`Successfully updated index.json`);
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
