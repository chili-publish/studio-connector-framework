import { Option, program } from 'commander';
import info from '../package.json';
import { runBuild } from './commands/build';
import { runDebugger } from './commands/debug';
import { runDelete } from './commands/delete';
import { runGetInfo } from './commands/info';
import { runInit } from './commands/init';
import { runLogin } from './commands/login';
import { runPublish } from './commands/publish';
import { runSetAuth } from './commands/set-auth';
import { AuthenticationUsage } from './commands/set-auth/types';
import { runStressTest } from './commands/stress';
import { runDemo, runTests } from './commands/test';
import { withErrorHandlerAction } from './core';
import {
  SupportedAuth as AuthenticationType,
  Type as ConnectorType,
  Tenant,
} from './core/types';
import { connectorProject } from './utils/connector-project';

function main() {
  program
    .name('connector-cli')
    .version(info.version, '-v, --version')
    .description('Tool to manage connector build, test and deploy process')
    .option('--verbose', 'Enable verbose logging');

  program
    .command('init')
    .description("Instantiate current directory as connector's project")
    .requiredOption('-n, --name <name>', 'Name of the connector')
    .addOption(
      new Option('-t, --type [type]', 'Type of the connector')
        .choices(Object.values(ConnectorType))
        .default('media')
    )
    .action(withErrorHandlerAction(runInit));

  program
    .command('new')
    .description("Instantiate a <name> directory as connector's project")
    .requiredOption('-n, --name <name>', 'Name of the connector')
    .addOption(
      new Option('-t, --type [type]', 'Type of the connector')
        .choices(Object.values(ConnectorType))
        .default('media')
    )
    .action(withErrorHandlerAction(runInit));

  program
    .command('publish')
    .description('Deploy your connector to defined environment')
    .addArgument(connectorProject)
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
    .option(
      '--proxyOption.forwardedHeaders',
      'If enabled, any request to connector via proxy ednpoint will include X-Forwarded-* headers'
    )
    .action(withErrorHandlerAction(runPublish));

  program
    .command('build')
    .description('Build connector project')
    .addArgument(connectorProject)
    .option('-w, --watch', 'Watch for changes')
    .action(withErrorHandlerAction(runBuild));

  program
    .command('debug')
    .description('Run connector project in debug mode for testing in browser')
    .addArgument(connectorProject)
    .option('-p, --port [port]', 'Port to run debug application', '3300')
    .option(
      '-w, --watch',
      "Enable watch mode to reload connector's code when changed"
    )
    .action(withErrorHandlerAction(runDebugger));

  program
    .command('info')
    .description(
      'Get connectors information, like capabilities, connector settings and etc.'
    )
    .addArgument(connectorProject)
    .option('-o, --out <out>', 'Output json file')
    .action(withErrorHandlerAction(runGetInfo));

  program
    .command('test')
    .addArgument(connectorProject)
    .requiredOption('-t, --testFile <testFile>')
    .action(withErrorHandlerAction(runTests));

  program
    .command('demo')
    .addArgument(connectorProject)
    .action(withErrorHandlerAction(runDemo));

  program
    .command('stress')
    .addArgument(connectorProject)
    .option('-i, --iterations <iterations>')
    .action(withErrorHandlerAction(runStressTest));

  program
    .command('login')
    .description(
      'Authorize in the system to deploy and configure your connector in the environment'
    )
    .addOption(
      new Option('-t, --tenant [tenant]', 'Which authentication tenant to use')
        .choices(Object.values(Tenant))
        .default(Tenant.Prod)
    )
    .action(runLogin);

  program
    .command('set-auth')
    .description('Configure authorization configuration of deployed connector')
    .addArgument(connectorProject)
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

  program
    .command('delete')
    .description('Remove the published connector from environment')
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
    .action(withErrorHandlerAction(runDelete));

  program.parse(process.argv);
}

try {
  main();
} catch (error) {
  console.error(error);
}
