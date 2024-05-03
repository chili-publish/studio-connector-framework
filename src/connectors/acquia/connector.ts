import { Connector, Media } from '@chili-publish/studio-connectors';

interface AcquiaAssetV2 {
  id: string;
  filename: string;
  external_id: string;
  file_properties: {
    format: string;
    format_type: string;
  };
  metadata: {
    fields: { [metadata_key: string]: Array<string> | string };
  };
}

interface GetAssetsResponse {
  items: Array<AcquiaAssetV2>;
}

interface AssetId {
  id: string;
  eid: string;
  filename: string;
  fileType: 'image' | 'pdf' | unknown;
}

class Converter {
  static assetToMedia(item: AcquiaAssetV2): Media.Media {
    const assetId: AssetId = {
      id: item.id,
      eid: item.external_id,
      filename: item.filename,
      fileType: item.file_properties.format_type.toLowerCase(),
    };
    return {
      id: JSON.stringify(assetId),
      name: item.filename,
      // TODO: to be defined
      relativePath: '/',
      // 0 - file
      // 1 - folder
      type: 0,
      extension: Converter.formatToExtension(item.file_properties.format),
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

  static formatToExtension(format: string): string {
    // Acquia identifies Pdf files with following format but we need file extenstion type
    if (format === 'PdfDocument') {
      return 'pdf';
    }
    return format.toLowerCase();
  }
}

export default class AcquiaConnector implements Media.MediaConnector {
  constructor(runtime: Connector.ConnectorRuntimeContext) {
    this.runtime = runtime;
  }

  runtime: Connector.ConnectorRuntimeContext;

  async detail(
    id: string,
    context: Connector.Dictionary
  ): Promise<Media.MediaDetail> {
    const { id: rawAssetId } = JSON.parse(id) as AssetId;
    let url = this.ensureTrailingSlash(this.runtime.options['BASE_URL']);

    url = url + `v2/assets/${rawAssetId}?expand=metadata,file_properties`;
    const t = await this.runtime.fetch(url, {
      method: 'GET',
    });
    if (!t.ok) {
      throw new Error(
        `Acquia DAM: Detail failed ${t.status} - ${t.statusText}`
      );
    }
    const data = JSON.parse(t.text);
    return Converter.assetToMedia(data);
  }

  async query(
    options: Connector.QueryOptions,
    context: Connector.Dictionary
  ): Promise<Media.MediaPage> {
    const startIndex = Number(options.pageToken) || 0;
    const query = context['query'] ?? '';
    const collection = context['collection'] ?? '';

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
      }&expand=metadata,file_properties`;

    const t = await this.runtime.fetch(url, {
      method: 'GET',
    });

    if (!t.ok) {
      throw new Error(`Acquia DAM: Query failed ${t.status} - ${t.statusText}`);
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
  }
  async download(
    id: string,
    previewType: Media.DownloadType,
    intent: Media.DownloadIntent,
    context: Connector.Dictionary
  ): Promise<Connector.ArrayBufferPointer> {
    // For backward compatibility with existing templates
    let endpoint = this._tryThumbnail(id);
    if (!endpoint) {
      endpoint = this._tryPreviewUrl(id, { previewType, intent });
    }

    const result = await this.runtime.fetch(endpoint, {
      method: 'GET',
    });
    if (!result.ok) {
      throw new Error(
        `Acquia DAM: Download failed ${result.status} - ${result.statusText}`
      );
    }
    return result.arrayBuffer;
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

  _tryThumbnail(id: string) {
    const { thumbnails } = JSON.parse(id) as {
      thumbnails: { '600px': { url: string } } | undefined;
    };
    let thumbnail = thumbnails?.['600px'];

    if (!thumbnail && thumbnails) {
      // take the last property of thumbnails for given asset
      const keys = Object.keys(thumbnails);
      thumbnail = thumbnails[keys[keys.length - 1]];
    }
    return thumbnail?.url;
  }

  _tryPreviewUrl(
    id: string,
    {
      previewType,
      intent,
    }: { previewType: Media.DownloadType; intent: Media.DownloadIntent }
  ) {
    const { eid, filename, fileType } = JSON.parse(id) as AssetId;
    let endpoint =
      this.ensureTrailingSlash(this.runtime.options['PREVIEW_BASE_URL']) +
      'content/' +
      eid;

    switch (previewType) {
      case 'thumbnail': {
        endpoint += '/jpeg' + '/' + filename + '?w=125';
        break;
      }
      case 'mediumres': {
        endpoint += '/png' + '/' + filename + '?w=400';
        break;
      }
      case 'highres':
        endpoint += '/png' + '/' + filename + '?w=1024';
        break;
      case 'fullres':
        if (intent === 'print') {
          if (fileType === 'image' || fileType === 'pdf') {
            endpoint += '/original' + '/' + filename + '?download=true';
          } else {
            endpoint += '/png' + '/' + filename + '?w=1024';
          }
        } else {
          endpoint += '/original' + '/' + filename + '?download=true';
        }
        break;
      case 'original':
        endpoint += '/original' + '/' + filename + '?download=true';
        break;
      default:
        endpoint += '/png' + '/' + filename + '?w=400';
    }
    return endpoint;
  }
}
