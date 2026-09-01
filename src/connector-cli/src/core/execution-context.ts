export interface ExecutionContext {
  verbose: boolean;
  dryRun: boolean | string;
  dryRunOut: string;
}

export const DEFAULT_EXECUTION_CONTEXT: ExecutionContext = {
  verbose: false,
  dryRun: false,
  dryRunOut: '',
};

let current: ExecutionContext = { ...DEFAULT_EXECUTION_CONTEXT };

export function getExecutionContext(): ExecutionContext {
  return current;
}

export function setExecutionContext(partial: Partial<ExecutionContext>): void {
  current = {
    verbose: partial.verbose ?? current.verbose,
    dryRun: partial.dryRun ?? current.dryRun,
    dryRunOut: partial.dryRunOut ?? current.dryRunOut,
  };
}

export function resetExecutionContext(): void {
  current = { ...DEFAULT_EXECUTION_CONTEXT };
}
