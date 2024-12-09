import path from 'path';
import { Type as ConnectorType } from '../../../core/types';

import { input, select } from '@inquirer/prompts';
import { NewCommandOptions } from '../types';

type ProjectParams = [
  path: string,
  name: string,
  connectorOptions: {
    connectorName: string;
    type: ConnectorType;
  },
];

const packageNameRegex =
  /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

export async function getProjectParams(
  options: NewCommandOptions & { projectName?: string }
): Promise<ProjectParams> {
  const projectName = await input({
    message: "Connector's project name",
    default: options.projectName || 'connector',
    validate: (value) => {
      return (
        packageNameRegex.test(value) ||
        'Invalid project name. The name must be a valid npm package name'
      );
    },
  });

  const type =
    options.type ||
    (await select({
      message: 'Connector type',
      choices: [
        {
          name: 'Media connector',
          value: ConnectorType.Media,
        },
        {
          name: 'Data connector',
          value: ConnectorType.Data,
        },
      ],
      default: ConnectorType.Media,
    }));

  const connectorName =
    options.connectorName ||
    (await input({
      message: 'Connector name. It populates "config.connectorName" field',
      default: projectName,
    }));

  const projectDirRaw =
    options.out ??
    (await input({
      message: 'Output directory',
      default: `./${projectName}`,
    }));

  return [path.resolve(projectDirRaw), projectName, { connectorName, type }];
}
