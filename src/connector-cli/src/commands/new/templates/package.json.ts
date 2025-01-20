import { ConnectorType } from '../../../core/types';
import {
  outputDirectory,
  outputFilename,
} from '../../../utils/connector-project';

export const getPackageJson = (
  projectName: string,
  type: ConnectorType,
  connectorName: string
) => ({
  name: projectName,
  description: '',
  version: '1.0.0',
  author: {
    name: 'CHILI publish',
    email: 'info@chili-publish.com',
    url: 'https://github.com/chili-publish',
  },
  config: {
    connectorName,
    type: type,
    options: {},
    mappings: {},
    supportedAuth: [],
  },
  license: 'MIT',
  main: `${outputDirectory}/${outputFilename}`,
  dependencies: {
    typescript: '^5.2.2',
    '@chili-publish/studio-connectors': '^1.17.1',
  },
  scripts: {
    build: 'yarn connector-cli build',
    test: 'yarn connector-cli test -t tests.json && yarn connector-cli stress',
  },
  devDependencies: {
    '@chili-publish/connector-cli': '^1.9.0',
  },
});
