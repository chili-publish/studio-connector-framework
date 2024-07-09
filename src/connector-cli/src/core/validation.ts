import { ExecutionError } from './types';

export function validateRuntimeOptions(
  inputs: Record<string, unknown> | undefined,
  schema: Record<string, unknown>
) {
  const errMessages: Array<string> = [];
  Object.entries(schema).reduce((errors, [key, value]) => {
    // When value on inputs schema 'null' or 'undefined' this field is required and should be passed via inputs
    if (value == null && !inputs?.[key]) {
      errors.push(`Missed required runtime option '${key}'`);
    }
    return errors;
  }, errMessages);

  if (inputs) {
    // Validate of passing keys that are not defined in schema
    Object.keys(inputs).reduce((errors, key) => {
      if (!(key in schema)) {
        errors.push(`Invalid runtime option '${key}'`);
      }
      return errors;
    }, errMessages);
  }
  if (errMessages.length > 0) {
    throw new ExecutionError(
      `${JSON.stringify(
        errMessages,
        null,
        2
      )}.\n To see all available options retrieve connector's info via "connector-cli [projectPath] info ..." command`
    );
  }
}
