import { outputDirectory } from '../../../utils/connector-project';
import { connectorTsCompilerOptionsJson } from '../../../compiler/connectorTsConfig';

export const getTsConfig = () => ({
  compilerOptions: {
    ...connectorTsCompilerOptionsJson,
  },
  include: ['**/*.ts'],
  exclude: ['node_modules', `${outputDirectory}`],
});
