import { Type } from '../../../core/types';
import {
  outputDirectory,
  outputFilename,
} from '../../../utils/connector-project';

export const getPackageJson = (projectName: string, type: Type) => ({
  name: projectName,
  description: '',
  version: '1.0.0',
  author: {
    name: 'CHILI publish',
    email: 'info@chili-publish.com',
    url: 'https://github.com/chili-publish',
  },
  config: {
    type: type,
    options: {},
    mappings: {},
    supportedAuth: [],
  },
  license: 'MIT',
  main: `${outputDirectory}/${outputFilename}`,
  dependencies: {
    typescript: '^5.2.2',
    '@chili-publish/studio-connectors': '^1.16.0',
  },
  scripts: {
    build: 'yarn connector-cli build',
    test: 'yarn connector-cli test -t tests.json && yarn connector-cli stress',
  },
  devDependencies: {
    '@chili-publish/connector-cli': '^1.9.0',
  },
});
