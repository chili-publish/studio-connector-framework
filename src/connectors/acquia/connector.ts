import { Connector, Media } from '@chili-publish/studio-connectors';
import { Converter } from './lib/converter';
import {
  buildPreviewUrl,
  ensureTrailingSlash,
  tryThumbnail,
} from './lib/preview';
import type { AssetId, GetAssetsResponse } from './lib/types';

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
    let url = ensureTrailingSlash(
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

    let url = ensureTrailingSlash(
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
    let endpoint = tryThumbnail(id);
    if (!endpoint) {
      endpoint = buildPreviewUrl(
        id,
        this.runtime.options['PREVIEW_BASE_URL'] as string,
        { previewType, intent }
      );
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
}
