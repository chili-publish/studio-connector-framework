import { getExecutionContext } from './execution-context';
import { ExecutionError } from './types';

export const supportedDryRunCommands = ['set-auth', 'delete-auth', 'publish'];

export function isDryRun() {
  return !!readDryRunOption() || !!readDryRunOutOption();
}

export function isDryRunToConsole() {
  return !!readDryRunOption();
}

export function isDryRunToFile() {
  return !!readDryRunOutOption();
}

export function readDryRunOption() {
  return getExecutionContext().dryRun;
}

export function readDryRunOutOption() {
  return getExecutionContext().dryRunOut;
}

export function checkDryRunExecution(command: string) {
  const dryRun = readDryRunOption();
  if (!supportedDryRunCommands.includes(command)) {
    throw new ExecutionError(
      `Unsupported argument "${dryRun ? '--dry-run' : '--dry-run-out'}"`
    );
  }
}
