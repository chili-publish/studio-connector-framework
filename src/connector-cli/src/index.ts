import { program } from 'commander';
import { runGetInfo } from './commands/info';
import { runDemo, runTests } from './commands/test';
import { runStressTest } from './commands/stress';
import { runDebugger } from './commands/debug';
import { runPublish } from './commands/publish';
import { runBuild } from './commands/build';
import { runInit } from './commands/init';
import info from '../package.json';

async function main() {
  program
    .name('connector-cli')
    .version(info.version)
    .description('Tool to manage connector test/publish process')
    .option('-v, --verbose', 'Enable verbose logging');

  program
    .command('init')
    .option('-n, --name <name>', 'Name to use for publishing')
    .action(runInit);

  program
    .command('publish')
    .argument(
      '[connectorFile]',
      'Connector file (built json) to publish to the marketplace',
      './connector.ts'
    )
    .option('-t, --token <token>', 'Token to use for publishing')
    .option('-e, --endpoint <endpoint>', 'Endpoint to use for publishing')
    .option('-n, --name <name>', 'Name to use for publishing')
    .option('-o, --overwrite', 'Overwrite existing connector')
    .action(runPublish);

  program
    .command('build')
    .argument(
      '[connectorFile]',
      'Connector file (ts) to publish to build',
      './connector.ts'
    )
    .option('-o, --outFolder <out>', 'Output folder')
    .option('-w, --watch', 'Watch for changes')
    .action(runBuild);

  program
    .command('debug')
    .argument(
      '[connectorFile]',
      'Connector file (ts) to run debug server for',
      './connector.ts'
    )
    .option('-p, --port <port>')
    .option('-w, --watch')
    .action(runDebugger);

  program
    .command('info')
    .argument(
      '[connectorFile]',
      'Connector file (ts) to get info about',
      './connector.ts'
    )
    .option('-o, --out <out>', 'Output json file')
    .action(runGetInfo);

  program
    .command('test')
    .argument(
      '[connectorFile]',
      'Connector file (ts) to run test suite for',
      './connector.ts'
    )
    .option('-t, --testFile <testFile>')
    .action(runTests);

  program
    .command('demo')
    .argument(
      '[connectorFile]', 
      'Connector file (ts) to run demo for', 
      './connector.ts')
    .action(runDemo);

  program
    .command('stress')
    .argument(
      '[connectorFile]',
      'Connector file (compiled js) to run stress test suite for',
      './connector.ts'
    )
    .option('-i, --iterations <iterations>')
    .action(runStressTest);

  program.parse(process.argv);
}

try {
  main();
} catch (error) {
  console.log(error);
}
