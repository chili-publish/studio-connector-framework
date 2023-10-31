import { Connector, Media } from '@chili-publish/studio-connectors';

interface AcquiaCollection {
  uuid: string;
  name: string;
}

interface AcquiaAssetV2 {
  id: string;
  filename: string;
  thumbnails: {
    '600px': string;
  };
  metadata: {
    fields: { [metadata_key: string]: Array<string> | string };
  };
}

interface GetCollectionsResponse {
  collections: Array<AcquiaCollection>;
  count: number;
}

interface GetAssetsResponse {
  items: Array<AcquiaAssetV2>;
}

class Converter {
  static collectionToMedia({
    collections,
  }: GetCollectionsResponse): Array<Media.Media> {
    return collections.map((c) => ({
      id: c.uuid,
      name: c.name,
      relativePath: '/',
      // 0 - file
      // 1 - folder
      type: 1,
      metaData: null,
    }));
  }

  static assetsToMedia({ items }: GetAssetsResponse): Array<Media.Media> {
    return items.map((a) => ({
      id: a.id,
      name: a.filename,
      // TODO: to be defined
      relativePath: '/',
      // 0 - file
      // 1 - folder
      type: 0,
      metaData: Object.entries(a.metadata.fields).reduce(
        (metadata, [fieldKey, fieldValue]) => {
          metadata[fieldKey] = Array.isArray(fieldValue)
            ? fieldValue[0]
            : fieldValue;
          return metadata;
        },
        {} as Connector.Dictionary
      ),
    }));
  }
}

export default class AcquiaConnector implements Media.MediaConnector {
  constructor(runtime: Connector.ConnectorRuntimeContext) {
    this.runtime = runtime;
  }

  runtime: Connector.ConnectorRuntimeContext;

  detail(
    id: string,
    context: Connector.Dictionary
  ): Promise<Media.MediaDetail> {
    // TODO: should be v2 API request
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
      const collection = context['collection'] ?? '';

      // TODO: implement the options.filter and append to query in a proper way
      // TODO: implement the options.collection and append to query in a proper way
      // TODO: implement the options.sort and append to query in a proper way

      let url = this.ensureTrailingSlash(this.runtime.options['BASE_URL']);

      // We append "collection" filtering if provided
      const finalQuery = collection ? query + ` cn:${collection}` : query;

      url =
        url +
        `v2/assets/search?${
          finalQuery ? 'query=' + finalQuery + '&' : ''
        }offset=${startIndex}&limit=${
          options.pageSize
        }&expand=thumbnails,metadata`;

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

      const data = JSON.parse(t.text);

      // transform the data to the MediaPage format
      return {
        pageSize: options.pageSize,
        data: Converter.assetsToMedia(data),
        links: {
          // TODO: Add pagination logic here
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
      {
        name: 'collection',
        displayName: 'Collection name',
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
