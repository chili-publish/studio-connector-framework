import {
  connectorFileName,
  outputDirectory,
} from '../../../utils/connector-project';

export const getTsConfig = () => ({
  compilerOptions: {
    lib: ['ES2020'],
    noEmitHelpers: true,
    module: 'ES2020',
    outDir: `${outputDirectory}`,
    target: 'ES2020',
    moduleResolution: 'Node',
    preserveConstEnums: false,
    esModuleInterop: false,
    removeComments: true,
    declaration: false,
  },
  include: [connectorFileName],
  exclude: ['node_modules', `${outputDirectory}`],
});
