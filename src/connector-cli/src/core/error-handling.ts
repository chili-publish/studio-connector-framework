import { error, verbose } from './logger';
import { ExecutionError } from './types';

export function withErrorHandlerAction(
  fn: (...args: any[]) => void | Promise<void>
): (...args: any[]) => void | Promise<void> {
  return async function (...args: any[]) {
    try {
      await fn(...args);
    } catch (err) {
      if (err instanceof ExecutionError) {
        error(err.message);
        return;
      }
      throw err;
    }
  };
}

export async function httpErrorHandler(res: Response) {
  try {
    const errorData = await res.json();
    verbose(
      'Error during HTTP request: \n' + JSON.stringify(errorData, null, 2)
    );
  } catch (e) {
    verbose('Error during HTTP request: ' + res.statusText);
  } finally {
    throw new ExecutionError(
      `Something went wrong during HTTP request. Execute command with --verbose flag for more information about error`
    );
  }
}
