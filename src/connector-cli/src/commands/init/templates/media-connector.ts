import { connectorFileName } from '../../../utils/connector-project';

const connectorFileContent = `import { Connector, Media } from "@chili-publish/studio-connectors";

export default class MyConnector implements Media.MediaConnector {

  private runtime: Connector.ConnectorRuntimeContext;

  constructor(runtime: Connector.ConnectorRuntimeContext) {
    this.runtime = runtime;
  }

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
  content: connectorFileContent,
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
