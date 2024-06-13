import path from 'path';
import fs from 'fs';
import { verbose } from './logger';
import { Convert, ExecutionError, SupportedAuth } from './types';

export function readConnectorConfig(connectorDirectoryPath: string) {
  const packageJsonPath = path.join(
    path.resolve(connectorDirectoryPath),
    'package.json'
  );
  verbose(`Reading connector configuration from ${packageJsonPath}`);
  if (!fs.existsSync(packageJsonPath)) {
    throw new ExecutionError(
      `Specified connector directory ${packageJsonPath} doesn't contain "package.json"`
    );
  }
  const packageJson = require(packageJsonPath);
  const { config } = packageJson;

  if (!(config instanceof Object)) {
    throw new ExecutionError(
      `Connector configuration is invalid. Please check the "config" field in package.json. Execute command with --verbose flag for more information about error`
    );
  }

  try {
    return Convert.toConnectorConfig(JSON.stringify(config));
  } catch (error) {
    const err = error as Error;
    // Handle Array of enum error more explicitly
    if (err.message.includes('"supportedAuth"')) {
      err.message = err.message.replace(
        'an optional object',
        `one of [${Object.values(SupportedAuth).map((v) => '"' + v + '"')}]`
      );
    }
    if (err.message.startsWith('Invalid value')) {
      verbose(err.message);
      throw new ExecutionError(
        `Connector configuration is invalid. Please check the "config" field in package.json. Execute command with --verbose flag for more information about error`
      );
    }
    throw err;
  }
}
