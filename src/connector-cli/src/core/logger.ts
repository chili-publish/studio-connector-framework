import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import {
  isDryRun,
  isDryRunToConsole,
  isDryRunToFile,
  readDryRunOutOption,
} from './dry-run';
import { ExecutionError } from './types';

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
  const prefix = isDryRun() ? '[Dry-run]: ' : '';
  const message = data
    ? `${prefix}${arg0}\n${JSON.stringify(data)}`
    : prefix + arg0;
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

export function logRequest(requestUrl: string, payload?: object) {
  const msg = `Sending HTTP request:\n"requestURL": ${requestUrl}\n ${
    payload ? 'requestPayload' + JSON.stringify(payload, null, 2) : ''
  }`;

  if (isDryRun()) {
    logDryRunRequest(msg, requestUrl, payload);
  } else {
    verbose(msg);
  }
}

function logDryRunRequest(
  msg: string,
  requestUrl: string,
  requestPayload?: object
) {
  if (isDryRunToConsole()) {
    info(msg);
  } else if (isDryRunToFile()) {
    const dryRunOut = readDryRunOutOption();
    const out = path.resolve(dryRunOut);
    if (!out.endsWith('.json')) {
      throw new ExecutionError(
        'Invalid  output file type. You should provide JSON file for results, i.e. "./out.json"'
      );
    }
    info(`Writing result to file: "${out}"...`);
    fs.writeFileSync(
      out,
      JSON.stringify({ requestUrl, requestPayload }, null, 2),
      'utf-8'
    );
  }
}

function formatMessage(arg0: string): any {
  return `+${(Date.now() - startTime) / 1000}s ${arg0}`;
}
