const fs = require('fs');
const path = require('path');

/*
  This script filters out connector versions that already exist in the PRD index.
  It reads connector files from a directory and the PRD index, then copies only
  new versions (that don't exist in PRD) to an output directory.
*/

function filterExistingVersions(connectorFilesDir, indexFilePath, outputDir) {
  // Read PRD index
  let indexJson = {};
  if (fs.existsSync(indexFilePath)) {
    const indexContent = fs.readFileSync(indexFilePath, 'utf-8');
    if (indexContent.trim()) {
      indexJson = JSON.parse(indexContent);
    }
  } else {
    console.log('PRD index.json not found, will include all versions');
  }

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  if (!fs.existsSync(connectorFilesDir)) {
    throw new Error(`Connector files directory does not exist: ${connectorFilesDir}`);
  }

  const files = fs.readdirSync(connectorFilesDir);
  const jsonFiles = files.filter(file => file.endsWith('.json') && file !== 'index.json');

  if (jsonFiles.length === 0) {
    console.log('No connector files found to filter');
    return { newVersionsCount: 0, skippedVersionsCount: 0 };
  }

  let newVersionsCount = 0;
  let skippedVersionsCount = 0;

  for (const file of jsonFiles) {
    const filePath = path.join(connectorFilesDir, file);
    let connectorData;

    try {
      connectorData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (error) {
      console.warn(`Warning: Skipping ${file} - invalid JSON: ${error.message}`);
      continue;
    }

    const connectorId = connectorData.id;
    const version = connectorData.version;

    if (!connectorId || !version) {
      console.warn(`Warning: Skipping ${file} - missing id or version field`);
      continue;
    }

    // Check if this version already exists in PRD index
    const existingVersions = indexJson[connectorId]?.versions || [];
    const versionExists = existingVersions.includes(version);

    if (versionExists) {
      console.log(`⚠️ Skipping ${file} - version ${version} already exists in PRD for ${connectorId}`);
      skippedVersionsCount++;
    } else {
      console.log(`✓ ${file} - version ${version} is new, will be published`);
      const outputPath = path.join(outputDir, file);
      fs.copyFileSync(filePath, outputPath);
      newVersionsCount++;
    }
  }

  return { newVersionsCount, skippedVersionsCount };
}

// Main execution
const connectorFilesDir = process.argv[2];
const indexFilePath = process.argv[3];
const outputDir = process.argv[4];

if (!connectorFilesDir) {
  console.error('Error: Connector files directory is required');
  process.exit(1);
}

if (!indexFilePath) {
  console.error('Error: Index file path is required');
  process.exit(1);
}

if (!outputDir) {
  console.error('Error: Output directory is required');
  process.exit(1);
}

try {
  const result = filterExistingVersions(connectorFilesDir, indexFilePath, outputDir);

  console.log(`\nFiltering complete:`);
  console.log(`  New versions to publish: ${result.newVersionsCount}`);
  console.log(`  Skipped (already exist): ${result.skippedVersionsCount}`);

  if (result.newVersionsCount === 0) {
    console.log('\nNo new versions to publish - all requested versions already exist in PRD');
    process.exit(2); // Exit code 2 indicates all versions already exist
  } else {
    process.exit(0);
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
