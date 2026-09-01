import { Connector, Media } from '@chili-publish/studio-connectors';

export default class TestMediaConnector implements Media.MediaConnector {
  private runtime: Connector.ConnectorRuntimeContext;

  constructor(runtime: Connector.ConnectorRuntimeContext) {
    this.runtime = runtime;
  }

  async query(
    options: Connector.QueryOptions,
    _context: Connector.Dictionary
  ): Promise<Media.MediaPage> {
    return {
      pageSize: options.pageSize ?? 1,
      data: [
        {
          id: 'asset-1',
          name: 'Asset 1',
          relativePath: '/asset-1',
          type: 0,
          metaData: {},
        },
      ],
      links: {
        nextPage: '',
      },
    };
  }

  async detail(
    id: string,
    _context: Connector.Dictionary
  ): Promise<Media.MediaDetail> {
    return {
      id,
      name: id,
      relativePath: `/${id}`,
      type: 0,
      metaData: {},
    };
  }

  async download(
    _id: string,
    _previewType: Media.DownloadType,
    _intent: Media.DownloadIntent,
    _context: Connector.Dictionary
  ): Promise<Connector.ArrayBufferPointer> {
    return {
      id: 'buffer',
      bytes: 0,
    };
  }

  getConfigurationOptions(): Connector.ConnectorConfigValue[] | null {
    return [];
  }

  getCapabilities(): Media.MediaConnectorCapabilities {
    return {
      query: true,
      detail: true,
      filtering: false,
      metadata: false,
    };
  }
}
