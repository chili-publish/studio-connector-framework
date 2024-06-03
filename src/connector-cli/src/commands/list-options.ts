import {
  startCommand,
  validateInputConnectorPath,
  info,
  readConnectorConfig,
} from '../core';

export enum ListCommandTypeOption {
  RuntimeOptions = 'runtime-options',
  SupportedAuth = 'supported-auth',
}

interface ListCommandOptions {
  type: ListCommandTypeOption;
}

export async function runListOptions(
  connectorPath: string,
  options: ListCommandOptions
): Promise<void> {
  startCommand('list-options', { connectorPath, options });
  if (!validateInputConnectorPath(connectorPath)) {
    return;
  }

  // store all options as vars
  const { type } = options;

  const connectorConfig = readConnectorConfig(connectorPath);

  switch (type) {
    case 'runtime-options': {
      if (Object.values(connectorConfig.options).length === 0) {
        info('No runtime options specified for this connector');
        return;
      }

      const formattedOptinos = Object.entries(connectorConfig.options).map(
        ([key, value]) => {
          const required = value === null || value === undefined;
          return {
            name: key,
            required,
            default: required ? 'N/A' : value,
          };
        }
      );

      console.table(formattedOptinos, ['name', 'required', 'default']);
      break;
    }
    case 'supported-auth': {
      if (
        !connectorConfig.supportedAuth ||
        Object.values(connectorConfig.supportedAuth).length === 0
      ) {
        info('No supported authentication specified for this connector');
        return;
      }

      const formattedOptinos = connectorConfig.supportedAuth.map((auth) => {
        return {
          type: auth,
        };
      });

      console.table(formattedOptinos, ['type']);
      break;
    }
    default:
      throw new Error('Unsupported command type');
  }
}
