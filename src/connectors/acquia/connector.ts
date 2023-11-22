import { Connector, Media } from '@chili-publish/studio-connectors';

export default class AcquiaConnector implements Media.MediaConnector {
  constructor(runtime: Connector.ConnectorRuntimeContext) {
    this.runtime = runtime;
  }

  runtime: Connector.ConnectorRuntimeContext;

  detail(
    id: string,
    context: Connector.Dictionary
  ): Promise<Media.MediaDetail> {
    //https://mysite.widencollective.com/api/rest/asset/uuid/uuid?options=preconversions,downloadUrl
    return Promise.resolve({
      name: 'dummy',
      extension: '',
    } as Media.MediaDetail);
  }
  

  async query(
    options: Connector.QueryOptions,
    context: Connector.Dictionary
  ): Promise<Media.MediaPage> {
    try {
      const startIndex = options.pageToken ?? 0;
      const query = context['query'] ?? '';

      // TODO: implement the options.filter and append to query in a proper way
      // TODO: implement the options.collection and append to query in a proper way
      // TODO: implement the options.sort and append to query in a proper way

      // based on docs, the query should be something like this:
      var url = this.ensureTrailingSlash(this.runtime.options['BASE_URL']);
      url =
        url +
        `api/rest/asset/search/query?start=${startIndex}&max=${options.pageSize}&sort=date-added-reversed&searchdocuments=false`;
      url = url + `&options=preconversions,downloadUrl`;
      url = url + `&metadata=`;
      url = url + `&query=${query}`;

      const t = await this.runtime.fetch(url, { method: 'GET' });

      if (!t?.ok) {
        this.runtime.logError(
          `Error while querying Acquia DAM: ${t?.status} - ${t?.statusText}`
        );
        return {
          pageSize: 0,
          data: [],
          links: {
            nextPage: '',
          },
        };
      }

      var data = JSON.parse(t.text);

      // transform the data to the MediaPage format
      return {
        pageSize: 10,
        data: data.items.map((item) => {
          return {
            // this id can be the literal uuid, or a JSON.stringify() of uuid + other info to later use in the download() method
            id: item.id,
            name: item.name,
            relativePath: item.url,
            type: 0,
            metaData: item.context,
          };
        }),
        links: {
          // should be the next startIndex in this case (see start and max parameters in the url above)
          nextPage: '',
        },
      };
    } catch (error) {
      this.runtime.logError(error);
    }
  }
  async download(
    id: string,
    previewType: Media.DownloadType,
    intent: Media.DownloadIntent,
    context: Connector.Dictionary
  ): Promise<Connector.ArrayBufferPointer> {
    try {
      // check if the previewUrls are 'predictable' and if so, just use the uuid to construct the url
      // otherwise, use the id to encode extra information of the previewUrl(s)
      const t = await Promise.resolve({
        arrayBuffer: { id: '{}', bytes: 1000 },
      });
      return t.arrayBuffer;
    } catch (error) {
      this.runtime.logError(error);
    }
  }
  getConfigurationOptions(): Connector.ConnectorConfigValue[] | null {
    return [
      {
        name: 'query',
        displayName: 'Search Query',
        type: 'text',
      },
    ];
  }
  getCapabilities(): Media.MediaConnectorCapabilities {
    return {
      detail: true,
      query: true,
      filtering: false,
    };
  }
  ensureTrailingSlash(arg0: string) {
    if (!arg0) return '';
    return arg0.endsWith('/') ? arg0 : arg0 + '/';
  }
}
