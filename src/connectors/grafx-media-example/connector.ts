// This connector is an example implementation of a media connector for the GraFx Environment API. It demonstrates how to implement the Connector interface to
// allow querying, retrieving details, downloading and uploading media
// It is derived from the internal GraFx Studio Media connectors but is not intended to be used, nor is there any promise that this connector will keep in sync.

import { Connector, Media } from '@chili-publish/studio-connectors';

// ─── Swagger-derived API Types ────────────────────────────────────────────────

/** EntityType from the GraFx Environment API (Swagger: EntityType enum) */
type GrafxEntityType = 'Item' | 'Directory' | string | number | null;

/** Asset schema from GET /media and GET /media/{mediaId} (Swagger: Asset) */
interface GrafxAsset {
  id: string;
  name: string | null;
  relativePath: string | null;
  extension: string | null;
  type: GrafxEntityType;
  width: number | null;
  height: number | null;
  metaData: Record<string, string> | null;
}

/** Paged response returned by GET /media (Swagger: AssetPagedResponse) */
interface GrafxAssetPagedResponse {
  data: GrafxAsset[] | null;
  pageSize: number;
  links: Record<string, string> | null;
  total: number | null;
}

interface GrafxAssetDetailResponse {
  data: GrafxAsset | null;
  links: Record<string, string> | null;
}
// ─── Additional runtime globals (not part of ConnectorHttpError, which is
//     already declared globally by @chili-publish/studio-connectors) ──────────

interface StudioFormDataInterface {
  append(key: string, value: unknown): void;
  toJSON(): string;
}

declare const StudioFormData: {
  new (): StudioFormDataInterface;
};

declare function sleep(ms: number): Promise<void>;

// ─── Connector implementation ─────────────────────────────────────────────────

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
      this._asBoolean(context['searchInUploadFolder']) ?? false;
    const browseQueryFolder = this._formatPath(
      (context['folder'] as string) ?? ''
    );
    const uploadQueryFolder = this._getUploadFolder(context);
    const queryConfigFolder = searchInUploadFolder
      ? uploadQueryFolder
      : browseQueryFolder;
    const includeSubfolders =
      this._asBoolean(context['includeSubfolders']) ?? true;
    const isSearching = filter.length > 0;
    const includeItemsFromSubfolders = isSearching && includeSubfolders;
    const collection = this._formatPath(
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
    return this._toMediaPage(json);
  }

  async detail(
    id: string,
    context: Connector.Dictionary
  ): Promise<Media.MediaDetail> {
    const queryEndpoint = `${this._getBaseMediaUrl()}/${encodeURIComponent(id)}`;

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

    const payload = JSON.parse(result.text) as GrafxAsset | GrafxAssetDetailResponse;
    const asset = this._extractAssetFromDetailResponse(payload);

    if (!asset.id) {
      throw new ConnectorHttpError(result.status, `Detail response does not contain a valid asset id`);
    }

    return this._assetToMediaDetail(asset);
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
    files: unknown[],
    context: Connector.Dictionary
  ): Promise<GrafxAsset[]> {
    const folderPath = this._getUploadFolder(context);

    let queryEndpoint = this._getBaseMediaUrl();
    queryEndpoint += `?folderPath=${encodeURIComponent(folderPath)}`;

    const uploadPromises = (files as Array<{ name: string }>).map((file) => {
      const formData = new StudioFormData();
      formData.append('file', file);

      const fullUrl =
        queryEndpoint + `&name=${encodeURIComponent(file.name)}`;

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

  // ─── Private helpers ──────────────────────────────────────────────────────

  private _getBaseMediaUrl(): string {
    let baseUrl = this.runtime.options['ENVIRONMENT_API'] as string;
    baseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    return baseUrl + 'media';
  }

  private _getUploadFolder(context: Connector.Dictionary): string {
    const uploadFolder = context['uploadFolder'] as string | undefined;
    return this._formatPath(
      uploadFolder && uploadFolder.trim().length > 0
        ? uploadFolder.trim()
        : '/Upload'
    );
  }

  /**
   * Normalise an arbitrary path string to a GraFx-compatible forward-slash
   * path that always starts with `/` and never ends with `/` (unless root).
   */
  private _formatPath(path: string): string {
    path = path.trim();

    if (path.length === 0) {
      return '/';
    }

    // Decode URL encoding if present (safe to call on already-decoded strings)
    path = decodeURIComponent(path);

    // Ensure leading slash, collapse backslashes and duplicate slashes
    path = ('/' + path).replace(/\\/g, '/').replace(/\/+/g, '/');

    // Remove trailing slash (unless root)
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }

    return path;
  }

  /**
   * Convert a raw `GrafxAssetPagedResponse` to the `Media.MediaPage` shape.
   * Directory assets have their name appended to `relativePath` so the full
   * path is available on the item (mirrors the original _formatRelativePath).
   */
  private _toMediaPage(json: GrafxAssetPagedResponse): Media.MediaPage {
    const data = (json.data ?? []).map((asset) => {
      if (this._isFolderEntityType(asset.type)) {
        const newRelativePath = `${asset.relativePath ?? ''}/${
          asset.name ?? ''
        }`.replace(/\/\//g, '/');
        asset = { ...asset, relativePath: newRelativePath };
      }
      return this._assetToMedia(asset);
    });

    return {
      pageSize: json.pageSize,
      links: {
        nextPage: json.links?.['nextPage'] ?? '',
      },
      data,
    };
  }

  private _assetToMedia(asset: GrafxAsset): Media.Media {
    const isFolder = this._isFolderEntityType(asset.type);
    return {
      id: asset.id,
      name: asset.name ?? '',
      relativePath: asset.relativePath ?? '',
      type: isFolder ? 1 : 0,
      metaData: asset.metaData ?? {},
      extension: asset.extension ?? '',
    };
  }

  private _assetToMediaDetail(asset: GrafxAsset): Media.MediaDetail {
    const isFolder = this._isFolderEntityType(asset.type);
    return {
      id: asset.id,
      name: asset.name ?? '',
      relativePath: asset.relativePath ?? '',
      type: isFolder ? 1 : 0,
      metaData: asset.metaData ?? {},
      extension: asset.extension ?? '',
      width: asset.width ?? undefined,
      height: asset.height ?? undefined,
    };
  }

  private _extractAssetFromDetailResponse(
    payload: GrafxAsset | GrafxAssetDetailResponse
  ): GrafxAsset {
    const maybeWrappedResponse = payload as GrafxAssetDetailResponse;
    if (maybeWrappedResponse?.data && typeof maybeWrappedResponse.data === 'object') {
      return maybeWrappedResponse.data;
    }

    return payload as GrafxAsset;
  }

  private _isFolderEntityType(entityType: unknown): boolean {
    if (typeof entityType === 'number') {
      return entityType === 1;
    }

    if (typeof entityType !== 'string') {
      return false;
    }

    const normalizedType = entityType.toLowerCase();
    return (
      normalizedType === 'directory' ||
      normalizedType === 'folder' ||
      normalizedType === 'collection' ||
      normalizedType === '1'
    );
  }

  private _asBoolean(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string' && value.length > 0) {
      return value.toLowerCase() === 'true';
    }
    return undefined;
  }
}