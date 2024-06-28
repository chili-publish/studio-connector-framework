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
import { ListCommandTypeOption, runListOptions } from './commands/list-options';
import { runSetAuth } from './commands/set-auth';
import { withErrorHandlerAction } from './core';
import { Tenant } from './core/types/types';
import { SupportedAuth as AuthenticationType } from './core/types/gen-types';
import { AuthenticationUsage } from './commands/set-auth/types';

function main() {
  program
    .name('connector-cli')
    .version(info.version, '-v, --version')
    .description('Tool to manage connector build, test and deploy process')
    .option('--verbose', 'Enable verbose logging');

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
      new Option(
        '-t, --tenant [tenant]',
        'Which authentication tenant to use. Important: if you target "baseUrl" to dev Environment API,  you should specify "tenant" as dev'
      )
        .choices(Object.values(Tenant))
        .default(Tenant.Prod)
    )
    .requiredOption(
      '-e, --environment <environment>',
      'Environment name to use for publishing, i.e. "cp-qeb-191"'
    )
    .requiredOption(
      '-b, --baseUrl <baseurl>',
      'Environemnt API endpoint to use for publishing, i.e. "https://main.cpstaging.online/grafx"'
    )
    .requiredOption(
      '-n, --name <name>',
      'Connector name to use for publishing, i.e. "MyConnector"'
    )
    .option(
      '--connectorId [connectorId]',
      'If provided, command will update existing connector instead of creating a new one'
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
    .requiredOption(
      '--proxyOption.allowedDomains <allowedDomains...>',
      'Specify an array of hosts (without the request schema) that the connector can make request to.' +
        ' You can use "*" to denote dynamic parts of the URL.' +
        ' Example usage: --proxyOption.allowedDomains "main-domain.com", --proxyOption.allowedDomains "*.sub-domain.com"'
    )
    .option('--proxyOption.forwardedHeaders')
    .action(withErrorHandlerAction(runPublish));

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
        .choices(Object.values(Tenant))
        .default(Tenant.Prod)
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
        .choices(Object.values(ListCommandTypeOption))
    )
    .action(runListOptions);

  program
    .command('set-auth')
    .argument(
      '[connectorPath]',
      'Path to connector where "package.json" is located',
      './'
    )
    .addOption(
      new Option(
        '-t, --tenant [tenant]',
        'Which authentication tenant to use. Important: if you target "baseUrl" to dev Environment API,  you should specify "tenant" as dev'
      )
        .choices(Object.values(Tenant))
        .default(Tenant.Prod)
    )
    .requiredOption(
      '-e, --environment <environment>',
      'Environment name to use for operation, i.e. "cp-qeb-191"'
    )
    .requiredOption(
      '-b, --baseUrl <baseurl>',
      'Environemnt API endpoint to use for operation, i.e. "https://main.cpstaging.online/grafx"'
    )
    .requiredOption(
      '--connectorId <connectorId>',
      'Id of the connector to perform operation'
    )
    .addOption(
      new Option(
        '-au, --usage <usage>',
        'Specify in which execution environment corresponding authentication going to be used'
      )
        .choices(Object.values(AuthenticationUsage))
        .makeOptionMandatory(true)
    )
    .addOption(
      new Option(
        '-at, --type <type>',
        'Specify the type of configured authentication'
      )
        .choices(Object.values(AuthenticationType))
        .makeOptionMandatory(true)
    )
    .requiredOption(
      '--auth-data-file <auth-data-file>',
      'Path to the file (json or yaml) that contains authentication information for the specified "--type"'
    )
    .action(withErrorHandlerAction(runSetAuth));

  program.parse(process.argv);
}

try {
  main();
} catch (error) {
  console.error(error);
}
