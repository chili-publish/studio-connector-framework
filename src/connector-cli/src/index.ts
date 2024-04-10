import { program, Option } from 'commander';
import { runGetInfo } from './commands/info';
import { runDemo, runTests } from './commands/test';
import { runStressTest } from './commands/stress';
import { runDebugger } from './commands/debug';
import { runPublish } from './commands/publish';
import { runBuild } from './commands/build';
import { runInit } from './commands/init';
import info from '../package.json';
import { runLogin } from './commands/login';
import { runListOptions } from './commands/list-options';

async function main() {
  program
    .name('connector-cli')
    .version(info.version)
    .description('Tool to manage connector test/publish process')
    .option('-v, --verbose', 'Enable verbose logging');

  program
    .command('init')
    .argument(
      '[directory]',
      'Directory where the project will be created',
      process.cwd()
    )
    .requiredOption(
      '-n, --name <name>',
      'Name of the connector. Will be used as package name'
    )
    .addOption(
      new Option('-t, --type [type]', 'Type of the connector')
        .choices(['media', 'fonts'])
        .default('media')
    )
    .action(runInit);

  program
    .command('publish')
    .argument(
      '[connectorFile]',
      'Path to connector file (with package.json) to publish to the environment',
      './connector.ts'
    )
    .addOption(
      new Option('-t, --tenant [tenant]', 'Which authentication tenant to use')
        .choices(['dev', 'prod'])
        .default('prod')
    )
    .requiredOption(
      '-e, --environment <environment>',
      'Environment to use for publishing'
    )
    .requiredOption('-b, --baseUrl <baseurl>', 'Endpoint to use for publishing')
    .requiredOption('-n, --name <name>', 'Name to use for publishing')
    .option(
      '--connectorId [connectorId]',
      'If provided, update of the existing connector is going to happen'
    )
    .option(
      '-ro, --runtimeOption [runtimeOptions...]',
      'Specify runtime options for the connector, i.e "-ro Key1=Value1 -ro Key2=Value2"',
      (currentValue, previous: Record<string, unknown>) => {
        if (!previous) {
          previous = {};
        }
        const [key, value] = currentValue.split('=');
        previous[key] = value;
        return previous;
      }
    )
    .option('--proxyOption.allowedDomains [allowedDomains...]')
    .option('--proxyOption.forwardedHeaders')
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
    .option('-p, --port [port]', 'Port to run debug application', '3300')
    .option(
      '-w, --watch',
      "Enable watch mode to reload connector's code when changed"
    )
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
    .requiredOption('-t, --testFile <testFile>')
    .action(runTests);

  program
    .command('demo')
    .argument(
      '[connectorFile]',
      'Connector file (ts) to run demo for',
      './connector.ts'
    )
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

  program
    .command('login')
    .addOption(
      new Option('-t, --tenant [tenant]', 'Which authentication tenant to use')
        .choices(['dev', 'prod'])
        .default('prod')
    )
    .action(runLogin);

  program
    .command('list-options')
    .argument(
      '[connectorPath]',
      'Path to connector where "package.json" is located',
      './'
    )
    .addOption(
      new Option('-t, --type <type>', 'Type of options that you want to list')
        .makeOptionMandatory(true)
        .choices(['runtime-options'])
    )
    .action(runListOptions);

  program.parse(process.argv);
}

try {
  main();
} catch (error) {
  console.log(error);
}
