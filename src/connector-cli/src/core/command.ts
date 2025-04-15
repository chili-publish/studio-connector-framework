import chalk from 'chalk';
import { program } from 'commander';
import version from '../../package.json';
import { checkDryRunExecution, isDryRun } from './dry-run';
import { enableVerboseLogging, info, verbose } from './logger';

export function startCommand(command: string, options: any) {
  if (program.opts().verbose) {
    enableVerboseLogging();
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
