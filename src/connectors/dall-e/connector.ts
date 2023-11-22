import { Connector, Media } from '@chili-publish/studio-connectors';

export default class DallEConnector implements Media.MediaConnector {
  constructor(runtime: Connector.ConnectorRuntimeContext) {
    this.runtime = runtime;
  }

  runtime: Connector.ConnectorRuntimeContext;

  async detail(
    id: string,
    context: Connector.Dictionary
  ): Promise<Media.MediaDetail> {
        return Promise.resolve({
      id: '',
      name: 'dummy',
      extension: '',
      type: 0,
      width: 0,
      height: 0,
      relativePath: '',
      metaData: {},
    } as Media.MediaDetail);
  }
  async query(
    options: Connector.QueryOptions,
    context: Connector.Dictionary
  ): Promise<Media.MediaPage> {

    


    return Promise.resolve({
      links: {
        nextPage: '',
      },
      pageSize: 10,
      data: [
        {
          id: '',
          name: 'dummy',
          extension: '',
          type: 0,
          width: 0,
          height: 0,
          relativePath: '',
          metaData: {},
        },
      ],
    }) as Promise<Media.MediaPage>;
  }
  async download(
    id: string,
    previewType: Media.DownloadType,
    intent: Media.DownloadIntent,
    context: Connector.Dictionary
  ): Promise<Connector.ArrayBufferPointer> {
    try {
      const t = await this.runtime.fetch(
        `https://dalle-proxy.azurewebsites.net/api/generate?prompt=${context.prompt??'empty'}&imagesize=${context.image_size??''}&cacheId=${context.cacheId??''}`,
        { method: 'GET' }
      );
      return t.arrayBuffer;
    } catch (error) {
      this.runtime.logError(error);
    }
  }
  getConfigurationOptions(): Connector.ConnectorConfigValue[] | null {
    return [
      {
        name: 'prompt',
        displayName: 'Prompt',
        type: 'text',
      },{
        name: 'image_size',
        displayName: 'Image Size (256, 512, 1024) (optional)',
        type: 'text',
      },
      {
        name: 'cacheId',
        displayName: 'Cache ID (optional)',
        type: 'text',
      },
    ];
  }
  getCapabilities(): Media.MediaConnectorCapabilities {
    return {
      detail: false,
      query: false,
      filtering: false,
    };
  }
}
