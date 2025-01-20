import chalk from 'chalk';
import { program } from 'commander';
import version from '../../package.json';
import { enableVerboseLogging, info, verbose } from './logger';
import { ExecutionError } from './types';

export const supportedDryRunCommands = ['set-auth'];

export function startCommand(command: string, options: any) {
  if (program.opts().verbose) {
    enableVerboseLogging();
  }

  if (isDryRun() && !supportedDryRunCommands.includes(command)) {
    throw new ExecutionError('Unsupported argument "--dry-run"');
  }
  info(`connector-cli v${version.version}`);
  verbose(
    `Running command: '${chalk.bold(command)}' with options: ${JSON.stringify(
      options
    )}`
  );
}

export function isDryRun() {
  return !!program.opts().dryRun;
}
