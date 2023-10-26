import fs from 'fs';
import readline from 'readline';
import {exec} from 'child_process';
import {fileURLToPath} from 'url';
import {dirname} from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// change dir to root of repo
process.chdir(__dirname + '/..');

// get all extra args
const args = process.argv.slice(2);

if (args.length > 0) {
  executeDebugFor({
    project: args[0],
    connectorPath: `./src/connectors/${args[0]}/out/connector.js`,
  });
} else {
  askForProjectAndExecuteDebug();
}

function askForProjectAndExecuteDebug() {
  // enumerate all projects in the ./src/connectors folder
  const projects = fs.readdirSync('./src/connectors');

  var validProjects = [];

  for (const project of projects) {
    // if project is not a folder, skip it
    if (!fs.statSync(`./src/connectors/${project}`).isDirectory()) {
      continue;
    }

    // check if <project>/out/connector.js exists
    const connectorPath = `./src/connectors/${project}/out/connector.js`;
    if (!fs.existsSync(connectorPath)) {
      continue;
    }

    validProjects.push({project, connectorPath});
  }

  // ask user to select a project using console readline
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question(
    `Found compiled projects:\n${validProjects
      .map((p, i) => `${i + 1}. ${p.project}`)
      .join('\n')}\n\nSelect a project to debug: `,
    answer => {
      // execute yarn connector-cli debug <project>
      const project = validProjects[answer - 1];
      executeDebugFor(project);

      // close readline
      rl.close();
    },
  );
}

function executeDebugFor(project) {
  const cmd = `yarn connector-cli debug ${project.connectorPath}`;

  console.log(`Running ${cmd}`);

  // run the command
  const child = exec(cmd);

  // pipe child stdout to process stdout
  child.stdout.pipe(process.stdout);

  // pipe child stderr to process stderr
  child.stderr.pipe(process.stderr);
}
