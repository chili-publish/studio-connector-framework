// iterate all folders in ./src/connectors and execute processConnector method

// processConnector method
// => takes in a dir, and
//    - builds the project using `yarn build`
//    - validates the <dir>/out folder contains a connector.js fil
//    - reads the <dir>/package.json and extract name, description, version, config, license, author
//    - creates a new json object using this info + embeds the connector.js file in a 'script' property
//    - writes the json object to <repo root>/publish/<name>.json

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const processConnector = (dir) => {
    try {
        // Build the project
        execSync('yarn build', { cwd: dir, stdio: 'inherit' });

        // Validate the out folder contains a connector.js file
        const outDir = path.join(dir, 'out');
        if (!fs.existsSync(outDir) || !fs.existsSync(path.join(outDir, 'connector.js'))) {
            console.error(`connector.js does not exist in ${outDir}`);
            return;
        }

        // Read the package.json and extract the necessary info
        const packageJson = require(path.join(dir, 'package.json'));
        const { name, description, version, config, license, author } = packageJson;

        // Read the connector.js file
        const connectorJs = fs.readFileSync(path.join(outDir, 'connector.js'), 'utf-8');

        // Create a new JSON object
        const jsonObject = {
            name,
            description,
            version,
            license,
            author,
            script: connectorJs
        };

        Object.assign(jsonObject, config);

        // Write the JSON object to <repo root>/publish/<name>.json
        const publishDir = path.join(__dirname, '..', 'publish');
        if (!fs.existsSync(publishDir)) {
            fs.mkdirSync(publishDir);
        }
        fs.writeFileSync(path.join(publishDir, `${name}.${version}.json`), JSON.stringify(jsonObject, null, 2));
        console.log(`Successfully processed ${name}`);
    } catch (error) {
        console.error(`Error processing ${dir}: ${error}`);
    }
};

const findRepoRoot = startPath => {
    let currentPath = startPath;
    while (!fs.existsSync(path.join(currentPath, 'package.json'))) {
        const parentPath = path.dirname(currentPath);
        if (parentPath === currentPath) {
            throw new Error('Root package.json not found');
        }
        currentPath = parentPath;
    }
    return currentPath;
};

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
