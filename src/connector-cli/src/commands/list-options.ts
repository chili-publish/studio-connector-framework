import { validateInputConnectorPath } from '../validation';
import path from 'path';
import { info, startCommand } from '../logger';

interface ListCommandOptions {
  type: 'runtime-options';
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

  const dir = path.resolve(connectorPath);
  const packageJson = require(path.join(dir, 'package.json'));

  const { config } = packageJson;

  switch (type) {
    case 'runtime-options': {
      if (!config?.options) {
        info('No runtime options specified for this connector');
        return;
      }

      const formattedOptinos = Object.entries(config.options).map(
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
    default:
      throw new Error('Unsupported command type');
  }
}
