import fs from 'fs';
import path from 'path';
import { error, verbose } from './logger';
import { ExecutionError } from './types';

export function validateInputConnectorFile(connectorFile: string): boolean {
  const pathToConnectorFile = path.resolve(connectorFile);
  verbose(`Checking connector's file in path ${pathToConnectorFile}`);
  if (fs.existsSync(pathToConnectorFile) === false) {
    error('connectorFile is required');
    return false;
  }
  if (path.extname(connectorFile) !== '.ts') {
    error('connectorFile must be a typescript file');
    return false;
  }
  return true;
}

export function validateInputConnectorPath(connectorPath: string): boolean {
  const connectorPckgJson = connectorPath + '/package.json';
  verbose(
    `Checking connector's "package.json" in ${path.resolve(connectorPckgJson)}`
  );
  if (fs.existsSync(path.resolve(connectorPckgJson)) === false) {
    error('You need to specify a valid path to the connector');
    return false;
  }
  return true;
}

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
      )}.\n To see all available options execute 'connector-cli pathToConnector list-options --type="runtime-options"'`
    );
  }
}
