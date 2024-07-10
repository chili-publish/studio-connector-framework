import { Type } from '../../core/types';
import {
  connectorFileName,
  outputDirectory,
  outputFilename,
} from '../../utils/connector-project';

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
  },
  license: 'MIT',
  main: `${outputDirectory}/${outputFilename}`,
  dependencies: {
    typescript: '^5.2.2',
    '@chili-publish/studio-connectors': '^1',
  },
  scripts: {
    build: 'yarn connector-cli build',
    test: 'yarn connector-cli test -t tests.json && yarn connector-cli stress',
  },
  devDependencies: {
    '@chili-publish/connector-cli': '^1',
  },
});

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

const mediaConnectorFileContent = `import { Connector, Media } from "@chili-publish/studio-connectors";

export default class MyConnector implements Media.MediaConnector {
  query(
    options: Connector.QueryOptions,
    context: Connector.Dictionary
  ): Promise<Media.MediaPage> {
    throw new Error("Method not implemented.");
  }
  detail(
    id: string,
    context: Connector.Dictionary
  ): Promise<Media.MediaDetail> {
    throw new Error("Method not implemented.");
  }
  download(
    id: string,
    previewType: Media.DownloadType,
    intent: Media.DownloadIntent,
    context: Connector.Dictionary
  ): Promise<Connector.ArrayBufferPointer> {
    throw new Error("Method not implemented.");
  }
  getConfigurationOptions(): Connector.ConnectorConfigValue[] | null {
    return [];
  }
  getCapabilities(): Media.MediaConnectorCapabilities {
    return {
      query: false,
      detail: false,
      filtering: false,
      metadata: false,
    };
  }
}`;
export const getMediaConnectorFile = () => ({
  content: mediaConnectorFileContent,
  fileName: connectorFileName,
});

export const getMediaConnectorTestFile = () => ({
  setup: {
    runtime_options: {
      BASE_URL: 'https://localhost:3000',
    },
  },
  tests: [
    {
      name: 'test1',
      method: 'download',
      arguments: {
        id: 'id',
        url: 'url',
        options: {},
      },
      asserts: {
        fetch: [
          {
            url: 'url',
            method: 'GET',
            count: 1,
          },
        ],
      },
    },
  ],
});

export const getGitIgnoreFile = () => `node_modules
${outputDirectory}`;
