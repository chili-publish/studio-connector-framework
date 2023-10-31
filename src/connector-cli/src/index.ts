import { program } from 'commander';
import { runGetInfo } from './commands/info';
import { runTests } from './commands/test';
import { runStressTest } from './commands/stress';
import { runDebugger } from './commands/debug';
import { runPublish } from './commands/publish';
import { runBuild } from './commands/build';
import { runInit } from './commands/init';

async function main() {
  program
    .name('connector-cli')
    .version('1.0.0')
    .description('Tool to manage connector test/publish process');

  program
    .command('init')
    .option('-n, --name <name>', 'Name to use for publishing')
    .action(runInit);

  program
    .command('publish')
    .argument(
      '<connectorFile>',
      'Connector file (built json) to publish to the marketplace'
    )
    .option('-t, --token <token>', 'Token to use for publishing')
    .option('-e, --endpoint <endpoint>', 'Endpoint to use for publishing')
    .option('-n, --name <name>', 'Name to use for publishing')
    .option('-o, --overwrite', 'Overwrite existing connector')
    .action(runPublish);

  program
    .command('build')
    .argument('<connectorFile>', 'Connector file (ts) to publish to build')
    .option('-o, --outFolder <out>', 'Output folder')
    .option('-w, --watch', 'Watch for changes')
    .action(runBuild);

  program
    .command('debug')
    .argument(
      '<connectorFile>',
      'Connector file (ts) to run debug server for'
    )
    .option('-p, --port <port>')
    .option('-w, --watch')
    .action(runDebugger);

  program
    .command('info')
    .argument('<connector file>', 'Connector file (ts) to get info about')
    .option('-o, --out <out>', 'Output json file')
    .action(runGetInfo);

  program
    .command('test')
    .argument('<connectorFile>', 'Connector file (ts) to run test suite for')
    .option('-t, --testFile <testFile>')
    .action(runTests);

  program
    .command('stress')
    .argument(
      '<connectorFile>',
      'Connector file (compiled js) to run stress test suite for'
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
