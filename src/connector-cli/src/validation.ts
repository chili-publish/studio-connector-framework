import fs from 'fs';
import path from 'path';
import { error } from './logger';

export function validateInputConnectorFile(connectorFile: string): boolean {
  connectorFile = connectorFile || './connector.ts';
  if (!connectorFile || fs.existsSync(connectorFile) === false) {
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
  const connectorPckgJson = connectorPath
    ? connectorPath + '/package.json'
    : './package.json';
  if (fs.existsSync(connectorPckgJson) === false) {
    error('You need specify a valid path to the connectors files');
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
  return errMessages;
}
