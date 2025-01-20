import chalk from 'chalk';

const startTime = Date.now();
let verboseEnabled: boolean = false;

export function enableVerboseLogging() {
  verboseEnabled = true;
  verbose(`Verbose logging enabled`);
}

export function info(arg0: string) {
  console.info(chalk.dim(formatMessage(arg0)));
}

export function errorNoColor(arg0: string) {
  console.error(formatMessage(arg0));
}

export function success(arg0: string, data: Record<string, unknown>): void;
export function success(arg0: string): void;
export function success(arg0: string, data?: Record<string, unknown>) {
  const message = data ? `${arg0}\n${JSON.stringify(data)}` : arg0;
  console.info(chalk.green(formatMessage(message)));
}

export function warn(arg0: string) {
  console.warn(chalk.yellow(formatMessage(arg0)));
}

export function error(arg0: string) {
  console.error(chalk.red(formatMessage(arg0)));
}

export function verbose(arg0: string) {
  if (verboseEnabled) {
    info(arg0);
  }
}

function formatMessage(arg0: string): any {
  return `+${(Date.now() - startTime) / 1000}s ${arg0}`;
}
