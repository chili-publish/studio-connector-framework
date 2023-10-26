import {program} from 'commander';
import {runGetInfo} from './commands/info';
import {runTests} from './commands/test';
import {runStressTest} from './commands/stress';
import {runDebugger} from './commands/debug';

async function main() {
  program
    .name('connector-cli')
    .version('1.0.0')
    .description('Tool to manage connector test/publish process');

  program
    .command('debug')
    .argument(
      '<connectorFile>',
      'Connector file (compiled js) to run debug server for',
    )
    .option('-p, --port <port>')
    .action(runDebugger);

  program
    .command('info')
    .argument('<connector file>', 'Connector file (compiled) to get info about')
    .option('-o, --out <out>', 'Output json file')
    .action(runGetInfo);

  program
    .command('test')
    .argument(
      '<connectorFile>',
      'Connector file (compiled js) to run test suite for',
    )
    .option('-t, --testFile <testFile>')
    .action(runTests);

  program
    .command('stress')
    .argument(
      '<connectorFile>',
      'Connector file (compiled js) to run stress test suite for',
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
