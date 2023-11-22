import version from '../package.json';
import chalk from 'chalk';

const startTime = Date.now();
let verboseEnabled: boolean = false;

export function startCommand(command: string, options: any) {
  if (options.verbose) {
    verboseEnabled = true;
  }

  info(`connector-cli v${version.version}`);
  info(
    `Running command: '${chalk.bold(command)}' with options: ${JSON.stringify(
      options
    )}`
  );

  if (verboseEnabled) {
    info(`Verbose logging enabled`);
  }
}

export function info(arg0: string) {
  console.info(chalk.dim(formatMessage(arg0)));
}

export function errorNoColor(arg0: string) {
  console.error(formatMessage(arg0));
}

export function success(arg0: string) {
  console.info(chalk.green(formatMessage(arg0)));
}

export function warn(arg0: string) {
  console.warn(chalk.yellow(formatMessage(arg0)));
}

export function error(arg0: string) {
  console.error(chalk.red(formatMessage(arg0)));
}

export function verbose(arg0: string) {
  if (verboseEnabled) {
    info(formatMessage(arg0));
  }
}

function formatMessage(arg0: string): any {
  return `+${(Date.now() - startTime) / 1000}s ${arg0}`;
}
