// This connector is an example implementation of a media connector for the GraFx Environment API. It demonstrates how to implement the Connector interface to
// allow querying, retrieving details, downloading and uploading media
// It is derived from the internal GraFx Studio Media connectors but is not intended to be used, nor is there any promise that this connector will keep in sync.

import { Connector, Media } from '@chili-publish/studio-connectors';
import {
  assetToMediaDetail,
  extractAssetFromDetailResponse,
  toMediaPage,
} from './lib/media';
import { asBoolean, formatPath, getUploadFolder } from './lib/path';
import type {
  GrafxAsset,
  GrafxAssetDetailResponse,
  GrafxAssetPagedResponse,
} from './lib/types';

export default class GrafxMediaConnector implements Media.MediaConnector {
  private runtime: Connector.ConnectorRuntimeContext;

  constructor(runtime: Connector.ConnectorRuntimeContext) {
    this.runtime = runtime;
  }

  async query(
    options: Connector.QueryOptions,
    context: Connector.Dictionary
  ): Promise<Media.MediaPage> {
    const filter = options.filter?.join(' ') ?? '';
    const pageToken = options.pageToken ?? '';
    const sortBy = options.sortBy ?? '';
    const sortOrder = options.sortOrder ?? '';
    const pageSize = options.pageSize ?? '';
    const searchInUploadFolder =
      asBoolean(context['searchInUploadFolder']) ?? false;
    const browseQueryFolder = formatPath(
      (context['folder'] as string) ?? ''
    );
    const uploadQueryFolder = getUploadFolder(context);
    const queryConfigFolder = searchInUploadFolder
      ? uploadQueryFolder
      : browseQueryFolder;
    const includeSubfolders =
      asBoolean(context['includeSubfolders']) ?? true;
    const isSearching = filter.length > 0;
    const includeItemsFromSubfolders = isSearching && includeSubfolders;
    const collection = formatPath(
      (options.collection as string | undefined) ?? ''
    );
    const collectionIsSubOfQueryFolder = collection
      ?.toLocaleLowerCase()
      .startsWith(queryConfigFolder.toLocaleLowerCase());
    const queryFolder = collectionIsSubOfQueryFolder
      ? collection
      : queryConfigFolder;

    let queryEndpoint = this._getBaseMediaUrl();

    const params: string[] = [
      `search=${encodeURIComponent(filter)}`,
      `limit=${encodeURIComponent(String(pageSize))}`,
      `sortBy=${encodeURIComponent(sortBy)}`,
      `sortOrder=${encodeURIComponent(sortOrder)}`,
      `includeItemsFromSubfolders=${encodeURIComponent(
        String(includeItemsFromSubfolders)
      )}`,
      `includeFolders=${encodeURIComponent(String(includeSubfolders))}`,
      `folder=${encodeURIComponent(queryFolder)}`,
    ];

    if (pageToken != null && pageToken.length > 0) {
      params.push(
        `nextPageToken=${encodeURIComponent(String(options.pageToken ?? ''))}`
      );
    }

    queryEndpoint += `?${params.join('&')}`;

    const result = await this.runtime.fetch(queryEndpoint, {
      method: 'GET',
      referrer: 'grafx-media-connector',
    });

    if (!result.ok) {
      throw new ConnectorHttpError(
        result.status,
        `Query failed ${result.status} ${result.statusText}`
      );
    }

    const json = JSON.parse(result.text) as GrafxAssetPagedResponse;
    return toMediaPage(json);
  }

  async detail(
    id: string,
    context: Connector.Dictionary
  ): Promise<Media.MediaDetail> {
    const queryEndpoint = `${this._getBaseMediaUrl()}/${encodeURIComponent(
      id
    )}`;

    const result = await this.runtime.fetch(queryEndpoint, {
      method: 'GET',
      referrer: 'grafx-media-connector',
    });

    if (!result.ok) {
      throw new ConnectorHttpError(
        result.status,
        `Detail failed ${result.status} ${result.statusText}`
      );
    }

    const payload = JSON.parse(result.text) as
      | GrafxAsset
      | GrafxAssetDetailResponse;
    const asset = extractAssetFromDetailResponse(payload);

    if (!asset.id) {
      throw new ConnectorHttpError(
        result.status,
        `Detail response does not contain a valid asset id`
      );
    }

    return assetToMediaDetail(asset);
  }

  async download(
    id: string,
    previewType: Media.DownloadType,
    downloadIntent: Media.DownloadIntent,
    context: Connector.Dictionary
  ): Promise<Connector.ArrayBufferPointer> {
    let queryEndpoint = `${this._getBaseMediaUrl()}/${encodeURIComponent(id)}`;

    switch (previewType) {
      case 'thumbnail':
        queryEndpoint += '/preview/thumbnail';
        break;
      case 'mediumres':
        queryEndpoint += '/preview/medium';
        break;
      case 'highres':
        queryEndpoint += '/preview/highest';
        break;
      case 'fullres':
        // Swagger: GET /media/{mediaId}/preview/{previewType}
        // previewType "FullOrVector" for print, "X4096" otherwise
        if (downloadIntent === 'print') {
          queryEndpoint += '/preview/fullOrVector';
        } else {
          queryEndpoint += '/preview/x4096';
        }
        break;
      case 'original':
        // Swagger: GET /media/{mediaId}/download
        queryEndpoint += '/download';
        break;
      default:
        queryEndpoint += '/preview/medium';
    }

    let result = await this.runtime.fetch(queryEndpoint, {
      method: 'GET',
      referrer: 'grafx-media-connector',
    });

    // Swagger: 202 means preview generation task was started; retry with backoff
    let tries = 1;
    while (result.status === 202 && tries < 5) {
      await sleep(500 * 1.5 ** tries);
      ++tries;
      result = await this.runtime.fetch(queryEndpoint, {
        method: 'GET',
        referrer: 'grafx-media-connector',
      });
    }

    if (result.status === 202) {
      throw new ConnectorHttpError(result.status, `Preview is not ready yet`);
    } else if (!result.ok) {
      throw new ConnectorHttpError(
        result.status,
        `Download failed ${result.status} ${result.statusText}`
      );
    }

    return result.arrayBuffer;
  }

  /**
   * Upload files to GraFx Media.
   * Swagger: POST /media?folderPath=...&name=...  (multipart/form-data)
   * Returns the created Asset objects.
   */
  async upload(
    files: Connector.FilePointer[],
    context: Connector.Dictionary
  ): Promise<GrafxAsset[]> {
    const folderPath = getUploadFolder(context);

    let queryEndpoint = this._getBaseMediaUrl();
    queryEndpoint += `?folderPath=${encodeURIComponent(folderPath)}`;

    const uploadPromises = files.map((file) => {
      const formData = new StudioFormData();
      formData.append('file', file);

      const fullUrl = queryEndpoint + `&name=${encodeURIComponent(file.name)}`;

      return this.runtime
        .fetch(fullUrl, {
          method: 'POST',
          body: formData.toJSON(),
          referrer: 'grafx-media-connector',
        })
        .then((result) => {
          if (!result.ok) {
            throw new ConnectorHttpError(
              result.status,
              `Upload failed ${result.status} ${result.statusText}`
            );
          }
          return JSON.parse(result.text) as GrafxAsset;
        });
    });

    return Promise.all(uploadPromises);
  }

  getConfigurationOptions(): Connector.ConnectorConfigValue[] | null {
    return [
      {
        name: 'folder',
        displayName: 'Folder',
        type: 'text',
      },
      {
        name: 'uploadFolder',
        displayName: 'Upload Folder',
        type: 'text',
      },
      {
        name: 'includeSubfolders',
        displayName: 'Include subfolders',
        type: 'boolean',
      },
    ];
  }

  getCapabilities(): Media.MediaConnectorCapabilities {
    return {
      detail: true,
      query: true,
      filtering: true,
      metadata: false,
      upload: true,
    };
  }

  private _getBaseMediaUrl(): string {
    const baseUrl = this.runtime.options['ENVIRONMENT_API'];
    if (typeof baseUrl !== 'string' || baseUrl.trim().length === 0) {
      throw new ConnectorHttpError(
        400,
        'Missing runtime option ENVIRONMENT_API'
      );
    }
    return `${baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`}media`;
  }
}
