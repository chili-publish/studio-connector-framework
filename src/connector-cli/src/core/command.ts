import chalk from 'chalk';
import version from '../../package.json';
import { checkDryRunExecution, isDryRun } from './dry-run';
import { getExecutionContext } from './execution-context';
import { info, verbose } from './logger';

export function startCommand(command: string, options: any) {
  if (getExecutionContext().verbose) {
    verbose(`Verbose logging enabled`);
  }

  if (isDryRun()) {
    checkDryRunExecution(command);
  }
  info(`connector-cli v${version.version}`);
  verbose(
    `Running command: '${chalk.bold(command)}' with options: ${JSON.stringify(
      options
    )}`
  );
}
