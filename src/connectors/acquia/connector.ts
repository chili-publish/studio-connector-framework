import { Connector, Media } from '@chili-publish/studio-connectors';
// force change to test build 5
interface AcquiaAssetV2 {
  id: string;
  filename: string;
  external_id: string;
  file_properties: {
    format: string;
    format_type: string;
    image_properties?: {
      width: number;
      height: number;
    };
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
  width?: number;
  height?: number;
}

class Converter {
  static assetToMedia(item: AcquiaAssetV2): Media.Media {
    const { width, height } = item.file_properties.image_properties ?? {};
    const assetId: AssetId = {
      id: item.id,
      eid: item.external_id,
      filename: item.filename,
      fileType: item.file_properties.format_type.toLowerCase(),
      width,
      height,
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

  static assetToMediaDetail(item: AcquiaAssetV2): Media.MediaDetail {
    const { width, height } = item.file_properties.image_properties ?? {};
    const media = this.assetToMedia(item);
    return {
      ...media,
      width,
      height,
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
    let url = this.ensureTrailingSlash(
      this.runtime.options['BASE_URL'] as string
    );

    url = url + `v2/assets/${rawAssetId}?expand=metadata,file_properties`;
    const t = await this.runtime.fetch(url, {
      method: 'GET',
    });
    if (!t.ok) {
      throw new ConnectorHttpError(
        t.status,
        `Acquia DAM: Detail failed ${t.status} - ${t.statusText}`
      );
    }
    const data = JSON.parse(t.text);
    return Converter.assetToMediaDetail(data);
  }

  async query(
    options: Connector.QueryOptions,
    context: Connector.Dictionary
  ): Promise<Media.MediaPage> {
    const startIndex = Number(options.pageToken) || 0;
    const query = context['query'] ?? '';
    const collection = context['collection'] ?? '';

    // TODO: implement the options.sort and append to query in a proper way

    let url = this.ensureTrailingSlash(
      this.runtime.options['BASE_URL'] as string
    );

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
      throw new ConnectorHttpError(
        t.status,
        `Acquia DAM: Query failed ${t.status} - ${t.statusText}`
      );
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
      throw new ConnectorHttpError(
        result.status,
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
      metadata: true,
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

  private _tryPreviewUrl(
    id: string,
    {
      previewType,
      intent,
    }: { previewType: Media.DownloadType; intent: Media.DownloadIntent }
  ) {
    const { eid, filename, fileType, ...size } = JSON.parse(id) as AssetId;
    let endpoint =
      this.ensureTrailingSlash(
        this.runtime.options['PREVIEW_BASE_URL'] as string
      ) +
      'content/' +
      eid;

    switch (previewType) {
      case 'thumbnail': {
        endpoint += '/jpeg' + '/' + filename + this._getPreviewSize(size, 125);
        break;
      }
      case 'mediumres': {
        endpoint += '/png' + '/' + filename + this._getPreviewSize(size, 400);
        break;
      }
      case 'highres':
        endpoint += '/png' + '/' + filename + this._getPreviewSize(size, 1024);
        break;
      case 'fullres':
        if (
          intent === 'print' &&
          (fileType === 'image' || fileType === 'pdf')
        ) {
          // TODO: Uncomment after https://chilipublishintranet.atlassian.net/browse/GRAFX-3314
          // endpoint += '/original' + '/' + filename + '?download=true';
          endpoint += '/png' + '/' + filename;
        } else {
          endpoint += '/png' + '/' + filename;
        }
        break;
      case 'original':
        endpoint += '/original' + '/' + filename + '?download=true';
        break;
      default:
        endpoint += '/png' + '/' + filename + this._getPreviewSize(size, 400);
    }
    return endpoint;
  }

  private _getPreviewSize(
    original: { width?: number; height?: number },
    max: 125 | 400 | 1024
  ) {
    const { width, height } = original;
    return `?w=${width && width < max ? width : max}&h=${
      height && height < max ? height : max
    }`;
  }
}
