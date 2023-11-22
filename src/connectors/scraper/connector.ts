import { Connector, Media } from '@chili-publish/studio-connectors';

export default class ScraperConnector implements Media.MediaConnector {
  constructor(runtime: Connector.ConnectorRuntimeContext) {
    this.runtime = runtime;
  }

  runtime: Connector.ConnectorRuntimeContext;

  async detail(
    id: string,
    context: Connector.Dictionary
  ): Promise<Media.MediaDetail> {



    const item = JSON.parse(id);

    return Promise.resolve(item as Media.MediaDetail);
  }
  async query(
    options: Connector.QueryOptions,
    context: Connector.Dictionary
  ): Promise<Media.MediaPage> {

    if (options.filter && options.filter.length > 0) {

      const filter = JSON.parse(options.filter[0]);
      if (filter.id) {
        return Promise.resolve({
          links: {
            nextPage: '',
          },
          pageSize: 1,
          data: [
            {
              id: JSON.stringify(filter),
              name: filter.name,
              extension: 'png',
              type: 0,
              relativePath: '/',
              metaData: {
                url: filter.url,
                baseUrl: context.url,
                id: filter.id,
              },
            } as Media.MediaDetail,
          ],
        }) as Promise<Media.MediaPage>;
      }

    }

    // download the context.url html page and parse it for images
    // return a MediaPage with the images found
    const html = await this.runtime.fetch('https://dalle-proxy.azurewebsites.net/api/generate?scrapePage=' + context.url, { method: 'GET' });

    let htmlContent = JSON.parse(html.text) as { src: string, name: string, id?: string }[];

    let mediaItems = htmlContent.map((item) => {
      const media = {
        id: item.id ?? item.src,
        name: item.name,
        extension: 'png',
        type: 0,
        relativePath: '/',
        metaData: {
          url: item.src,
          baseUrl: context.url,
          id: item.id,
        },
      } as Media.MediaDetail;

      media.id = JSON.stringify(media);

      return media;
    });


    return Promise.resolve({
      links: {
        nextPage: '',
      },
      pageSize: mediaItems.length,
      data: mediaItems,
    }) as Promise<Media.MediaPage>;
  }
  async download(
    id: string,
    previewType: Media.DownloadType,
    intent: Media.DownloadIntent,
    context: Connector.Dictionary
  ): Promise<Connector.ArrayBufferPointer> {
    try {

      const item = JSON.parse(id);
      let url = item.metaData.url;
      if (item.metaData.url && !item.metaData.url.startsWith('http') && !item.metaData.url.startsWith('data:')) {
        if (item.metaData.url.startsWith('/')) {
          // get root domain of baseUrl
          const urlObject = RegExp('^(?:https?:)?(?:\/\/)?([^\/\?]+)').exec(item.metaData.baseUrl);
          url = urlObject ? urlObject[0] + item.metaData.url : item.metaData.url;
        } else {
          url = item.metaData.baseUrl + item.metaData.url;
        }
      }

      const t = await this.runtime.fetch(
        'https://dalle-proxy.azurewebsites.net/api/generate?proxyUrl=' + url,
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
        name: 'url',
        displayName: 'Source URL',
        type: 'text',
      },
    ];
  }
  getCapabilities(): Media.MediaConnectorCapabilities {
    return {
      detail: true,
      query: true,
      filtering: true,
    };
  }
}
