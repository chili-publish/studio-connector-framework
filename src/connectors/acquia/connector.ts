import { Connector, Media } from '@chili-publish/studio-connectors';

interface AcquiaAssetV2 {
  id: string;
  filename: string;
  thumbnails: {
    '600px': { url: string };
  };
  external_id: string;
  metadata: {
    fields: { [metadata_key: string]: Array<string> | string };
  };
}

interface GetAssetsResponse {
  items: Array<AcquiaAssetV2>;
}

class Converter {
  static assetToMedia(item: AcquiaAssetV2): Media.Media {
    return {
      id: JSON.stringify({
        id: item.id,
        eid: item.external_id,
        thumbnails: item.thumbnails,
      }),
      name: item.filename,
      // TODO: to be defined
      relativePath: '/',
      // 0 - file
      // 1 - folder
      type: 0,
      extension: 'png',
      metaData: Object.entries(item.metadata.fields).reduce(
        (metadata, [fieldKey, fieldValue]) => {
          metadata[fieldKey] = Array.isArray(fieldValue)
            ? fieldValue[0]
            : fieldValue;
          return metadata;
        },
        {} as Connector.Dictionary
      ),
    };
  }
}

export default class AcquiaConnector implements Media.MediaConnector {
  constructor(runtime: Connector.ConnectorRuntimeContext) {
    this.runtime = runtime;
    // TODO: Should be taken from configuration
    this.runtime.options['BASE_URL'] = 'https://api.widencollective.com/';
  }

  runtime: Connector.ConnectorRuntimeContext;

  async detail(
    id: string,
    context: Connector.Dictionary
  ): Promise<Media.MediaDetail> {
    const { id: assetId } = JSON.parse(id) as Pick<AcquiaAssetV2, 'id'>;
    let url = this.ensureTrailingSlash(this.runtime.options['BASE_URL']);

    url = url + `v2/assets/${assetId}?expand=thumbnails,metadata`;
    const t = await this.runtime.fetch(url, {
      method: 'GET',
    });
    if (!t?.ok) {
      this.runtime.logError(
        `Error while querying Acquia DAM: ${t?.status} - ${t?.statusText}`
      );
      return {
        id: '',
        name: '',
        relativePath: '',
        type: 0,
        metaData: {},
      };
    }
    const data = JSON.parse(t.text);
    return Converter.assetToMedia(data);
  }
  

  async query(
    options: Connector.QueryOptions,
    context: Connector.Dictionary
  ): Promise<Media.MediaPage> {
    try {
      const startIndex = Number(options.pageToken) || 0;
      const query = context['query'] ?? '';
      const collection = context['collection'] ?? '';

      // TODO: implement the options.filter and append to query in a proper way
      // TODO: implement the options.sort and append to query in a proper way

      let url = this.ensureTrailingSlash(this.runtime.options['BASE_URL']);

      // mediaId will be used for filtering, so we need to parse it.
      // filtering could also be just a string, so we need to handle that as well (try/catch)
      let filter = undefined;
      if (options.filter && options.filter.length > 0) {
        try {
          const temp = JSON.parse(options.filter[0]);
          filter = temp.eid;
        } catch (error) {
          filter = options.filter[0];
        }
      }

      // We append "collection" filtering if it's provided
      let finalQuery = collection ? query + ` cn:${collection}` : query;
      // supporting the queryOptions filter is required for the advanced demo
      let filterQuery = filter ? ` (eid:${filter} or fn:${filter})` : '';
      finalQuery = finalQuery + filterQuery;

      url =
        url +
        `v2/assets/search?${
          finalQuery ? 'query=' + finalQuery + '&' : ''
        }offset=${startIndex * options.pageSize}&limit=${
          options.pageSize
        }&expand=thumbnails,metadata`;

      const t = await this.runtime.fetch(url, {
        method: 'GET',
      });

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

      const data: GetAssetsResponse = JSON.parse(t.text);

      // transform the data to the MediaPage format
      const result = {
        pageSize: options.pageSize,
        data: data.items.map(Converter.assetToMedia),
        links: {
          nextPage: `${
            data.items.length < options.pageSize ? '' : startIndex + 1
          }`,
        },
      };

      return result;
    } catch (error) {
      this.runtime.logError(error);
      return {
        pageSize: 0,
        data: [],
        links: {
          nextPage: 'ERROR:: ' + JSON.stringify(error),
        },
      };
    }
  }
  async download(
    id: string,
    previewType: Media.DownloadType,
    intent: Media.DownloadIntent,
    context: Connector.Dictionary
  ): Promise<Connector.ArrayBufferPointer> {
    try {
      const { thumbnails } = JSON.parse(id) as Pick<
        AcquiaAssetV2,
        'thumbnails'
      >;
      // TODO: Quality should be taken based on "previewType" argument value
      let thumbnail = thumbnails['600px'];

      if (!thumbnail) {
        // take the last property of thumbnails for given asset
        const keys = Object.keys(thumbnails);
        thumbnail = thumbnails[keys[keys.length - 1]];
      }

      const result = await this.runtime.fetch(thumbnail.url, { method: 'GET' });
      return result.arrayBuffer;
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
      filtering: true,
    };
  }
  ensureTrailingSlash(arg0: string) {
    if (!arg0) return '';
    return arg0.endsWith('/') ? arg0 : arg0 + '/';
  }
}
