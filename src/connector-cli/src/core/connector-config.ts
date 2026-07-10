import { verbose } from './logger';
import { ConnectorConfig, Convert, ExecutionError, SupportedAuth } from './types';

const supportedAuthRequiringAuthenticationConfig = [
  SupportedAuth.OAuth2AuthorizationCode,
  SupportedAuth.OAuth2JwtBearer,
] as const;

function validateRequiredAuthenticationConfig(config: ConnectorConfig) {
  const missingAuthenticationConfig = supportedAuthRequiringAuthenticationConfig.filter(
    (authType) =>
      config.supportedAuth.includes(authType) && !config.authenticationConfig?.[authType]
  );

  if (missingAuthenticationConfig.length === 0) {
    return;
  }

  verbose(
    `Missing required authenticationConfig entries for supportedAuth values: ${missingAuthenticationConfig.join(
      ', '
    )}`
  );

  throw new ExecutionError(
    `Connector configuration is invalid. Please check the "config" field in package.json. Execute command with --verbose flag for more information about error`
  );
}

export function readConnectorConfig(packageJsonPath: string) {
  const packageJson = require(packageJsonPath);
  const { config } = packageJson;

  if (!(config instanceof Object)) {
    throw new ExecutionError(
      `Connector configuration is invalid. Please check the "config" field in package.json. Execute command with --verbose flag for more information about error`
    );
  }

  try {
    const connectorConfig = Convert.toConnectorConfig(JSON.stringify(config));
    validateRequiredAuthenticationConfig(connectorConfig);

    return connectorConfig;
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
