import path from 'path';
import { ConnectorType } from '../../../core/types';

import { input, select } from '@inquirer/prompts';
import { error } from '../../../core';
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
  let inputProjectName = options.projectName;
  if (inputProjectName && !packageNameRegex.test(inputProjectName)) {
    error('Invalid project name. The name must be a valid npm package name');
    inputProjectName = undefined;
  }
  const projectName =
    inputProjectName ||
    (await input({
      message: "Connector's project name",
      default: 'connector',
      validate: (value) => {
        return (
          packageNameRegex.test(value) ||
          'Invalid project name. The name must be a valid npm package name'
        );
      },
    }));

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
