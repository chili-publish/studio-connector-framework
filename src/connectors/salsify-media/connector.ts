import { Connector, Media } from '@chili-publish/studio-connectors';

// Salsify's digital-asset API returns the same envelope as records:
//   { "data": [ ...assets ], "meta": { "per_page": "100", "cursor": <token|null>,
//                                       "total_entries": N } }
// Each asset carries a PUBLIC Cloudinary URL (salsify:url) plus dimensions.
interface SalsifyAsset {
  'salsify:id'?: string;
  'salsify:url'?: string;
  'salsify:filename'?: string;
  'salsify:name'?: string;
  'salsify:format'?: string;
  'salsify:asset_width'?: number;
  'salsify:asset_height'?: number;
  'salsify:asset_resource_type'?: string;
}

interface SalsifyAssetsResponse {
  data?: SalsifyAsset[];
  meta?: {
    cursor?: string | null;
    per_page?: string | number;
    total_entries?: number;
  };
}

const DEFAULT_QUERY_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

// Cloudinary transform (inserted after "/image/upload/") per requested preview
// size. Verified live: /image/upload/c_limit,w_240,q_auto/<hash>.jpg resizes on
// the fly. `c_limit` caps the width WITHOUT upscaling (bare `w_1600` inflated an
// 800px asset to 441KB — larger than its original); `q_auto` recompresses
// (~15-30% smaller, same visible quality). fullres/original stay untouched for
// print fidelity.
const TRANSFORM_BY_PREVIEW: Record<Media.DownloadType, string> = {
  thumbnail: 'c_limit,w_240,q_auto',
  mediumres: 'c_limit,w_800,q_auto',
  highres: 'c_limit,w_1600,q_auto',
  fullres: '',
  original: '',
};

export default class SalsifyMediaConnector implements Media.MediaConnector {
  private runtime: Connector.ConnectorRuntimeContext;
  // Caches the id -> asset resolution so repeat downloads of the same asset
  // (different preview sizes, re-renders) skip the metadata round-trip.
  private assetCache: Map<string, SalsifyAsset> = new Map();

  constructor(runtime: Connector.ConnectorRuntimeContext) {
    this.runtime = runtime;
  }

  // ─── Public connector methods ─────────────────────────────────────────────

  async query(
    options: Connector.QueryOptions,
    context: Connector.Dictionary
  ): Promise<Media.MediaPage> {
    return this.withTiming(async () => {
      const requested =
        options.pageSize && options.pageSize > 0
          ? options.pageSize
          : DEFAULT_QUERY_PAGE_SIZE;
      const params: Record<string, string> = {
        per_page: String(Math.min(requested, MAX_PAGE_SIZE)),
      };
      const filter = this.readAssetFilter(context);
      if (filter) {
        params['filter'] = filter;
      }
      if (options.pageToken) {
        params['cursor'] = options.pageToken;
      }

      const response = await this.fetchJson<SalsifyAssetsResponse>(
        this.buildAssetsUrl(params)
      );
      const assets = response.data ?? [];
      // Warm the cache so a subsequent detail/download of a browsed asset skips
      // the resolve round-trip.
      for (const asset of assets) {
        const aid = asset['salsify:id'];
        if (typeof aid === 'string' && aid) this.assetCache.set(aid, asset);
      }
      return {
        pageSize: assets.length,
        data: assets.map((asset) => this.toMedia(asset)),
        links: { nextPage: response.meta?.cursor ?? '' },
      };
    }, 'query');
  }

  async detail(
    id: string,
    _context: Connector.Dictionary
  ): Promise<Media.MediaDetail> {
    return this.withTiming(async () => {
      // One-hop: an id that is already a URL (bound from the data connector's
      // image:url column) carries no metadata — return what the URL gives us,
      // no API call. Dimensions come from the data connector's own columns.
      if (this.isUrl(id)) {
        return {
          id,
          name: this.filenameFromUrl(id),
          relativePath: '/',
          type: 0,
          metaData: {},
        };
      }
      const asset = await this.resolveAsset(id);
      const media = this.toMedia(asset);
      const width = asset['salsify:asset_width'];
      const height = asset['salsify:asset_height'];
      return {
        ...media,
        ...(typeof width === 'number' ? { width } : {}),
        ...(typeof height === 'number' ? { height } : {}),
      };
    }, 'detail');
  }

  async download(
    id: string,
    previewType: Media.DownloadType,
    _intent: Media.DownloadIntent,
    _context: Connector.Dictionary
  ): Promise<Connector.ArrayBufferPointer> {
    return this.withTiming(async () => {
      let url: string;
      let isImage = true;
      if (this.isUrl(id)) {
        // One-hop path: the id IS the public Salsify CDN URL (bound from the
        // data connector's image:url column), so skip the id->url resolve
        // entirely — one proxy round-trip instead of two.
        url = id.trim();
      } else {
        // Asset-id path (e.g. from the asset browser): resolve id -> url,
        // cached so re-renders and other sizes don't re-resolve.
        const asset = await this.resolveAsset(id);
        const resolved = asset['salsify:url'];
        if (!resolved) {
          throw new Error(
            `Salsify media connector: asset "${id}" has no downloadable salsify:url.`
          );
        }
        url = resolved;
        isImage =
          (asset['salsify:asset_resource_type'] ?? 'image') === 'image';
      }
      const fetchUrl = isImage ? this.applyTransform(url, previewType) : url;

      const picture = await this.withTiming(
        () => this.runtime.fetch(fetchUrl, { method: 'GET' }),
        `fetch GET ${this.describeUrl(fetchUrl)}`
      );
      if (!picture.ok) {
        throw new ConnectorHttpError(
          picture.status,
          `Salsify media connector: image fetch failed — ${picture.status} ${picture.statusText}`
        );
      }
      return picture.arrayBuffer;
    }, 'download');
  }

  getCapabilities(): Media.MediaConnectorCapabilities {
    return {
      query: true,
      detail: true,
      // No framework-level free-text search — narrowing is via the raw
      // Salsify `assetFilter` config option instead.
      filtering: false,
      metadata: true,
    };
  }

  getConfigurationOptions(): Connector.ConnectorConfigValue[] | null {
    return [
      {
        name: 'assetFilter',
        displayName: 'Salsify asset filter',
        type: 'text',
        helpText:
          'Optional. Raw Salsify filter expression to limit which assets the ' +
          "browser lists, e.g. ='salsify:format':'jpg'. Leave blank to list all.",
      },
    ];
  }

  // ─── Private helpers ────────────────────────────────────────────────────

  private isUrl(id: string): boolean {
    return /^https?:\/\//i.test(id.trim());
  }

  private filenameFromUrl(url: string): string {
    const clean = url.split('?')[0].split('#')[0];
    const segment = clean.substring(clean.lastIndexOf('/') + 1);
    return segment || url;
  }

  private async resolveAsset(id: string): Promise<SalsifyAsset> {
    const cached = this.assetCache.get(id);
    if (cached) return cached;
    const asset = await this.fetchJson<SalsifyAsset>(this.buildAssetUrl(id));
    this.assetCache.set(id, asset);
    return asset;
  }

  private readAssetFilter(context: Connector.Dictionary): string {
    return String(context['assetFilter'] ?? '').trim();
  }

  private toMedia(asset: SalsifyAsset): Media.Media {
    const id = String(asset['salsify:id'] ?? '');
    const name = String(
      asset['salsify:filename'] ?? asset['salsify:name'] ?? id
    );
    const metaData: Connector.Dictionary = {};
    const width = asset['salsify:asset_width'];
    const height = asset['salsify:asset_height'];
    if (typeof width === 'number') metaData['width'] = String(width);
    if (typeof height === 'number') metaData['height'] = String(height);

    const media: Media.Media = {
      id,
      name,
      relativePath: '/',
      type: 0,
      metaData,
    };
    const format = asset['salsify:format'];
    if (typeof format === 'string' && format !== '') {
      media.extension = format;
    }
    return media;
  }

  /**
   * Inserts a Cloudinary size transform into a Salsify CDN URL, e.g.
   * https://images.salsify.com/image/upload/<hash>.jpg  ->
   * https://images.salsify.com/image/upload/w_240/<hash>.jpg
   * Returns the URL unchanged when the preview needs no transform or the URL
   * isn't a Cloudinary upload URL.
   */
  private applyTransform(url: string, previewType: Media.DownloadType): string {
    const transform = TRANSFORM_BY_PREVIEW[previewType] ?? '';
    if (!transform) return url;
    const marker = '/image/upload/';
    const idx = url.indexOf(marker);
    if (idx < 0) return url;
    const insertAt = idx + marker.length;
    return `${url.slice(0, insertAt)}${transform}/${url.slice(insertAt)}`;
  }

  private buildAssetsUrl(params: Record<string, string>): string {
    const search = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    return `${this.assetsBase()}${search ? `?${search}` : ''}`;
  }

  private buildAssetUrl(id: string): string {
    return `${this.assetsBase()}/${encodeURIComponent(id)}`;
  }

  private assetsBase(): string {
    const orgId = this.requireOption('SALSIFY_ORG_ID');
    return `https://app.salsify.com/api/v1/orgs/${encodeURIComponent(orgId)}/digital_assets`;
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const init: Connector.ChiliRequestInit = {
      method: 'GET',
      headers: { Accept: 'application/json' },
    };
    const label = `fetch GET ${this.describeUrl(url)}`;
    const now = this.monotonicNow();
    const start = now();
    let response = await this.withTiming(
      () => this.runtime.fetch(url, init),
      label
    );
    // Same cold-start 401 misfire the data connector guards against: the auth
    // layer occasionally 401s once, then the static key works on retry. Only
    // retry a fast failure (a slow one risks the 10s output-job ceiling).
    if (response.status === 401 && now() - start < 2000) {
      response = await this.withTiming(
        () => this.runtime.fetch(url, init),
        `${label} (retry after 401)`
      );
    }
    if (!response.ok) {
      const body =
        typeof response.text === 'string' && response.text.length > 0
          ? response.text.slice(0, 500)
          : '(no body)';
      throw new ConnectorHttpError(
        response.status,
        `Salsify media connector: GET ${url} failed — ${response.status} ${response.statusText} — ${body}`
      );
    }
    const text = response.text;
    if (!text || text.trim() === '') {
      return {} as T;
    }
    try {
      return JSON.parse(text) as T;
    } catch (e) {
      throw new Error(
        `Salsify media connector: invalid JSON response: ${(e as Error).message}`
      );
    }
  }

  private describeUrl(url: string): string {
    const apiIdx = url.indexOf('/api/');
    if (apiIdx >= 0) return url.slice(apiIdx);
    const uploadIdx = url.indexOf('/image/upload/');
    return uploadIdx >= 0 ? url.slice(uploadIdx) : url;
  }

  /**
   * Logs how long a method / fetch took when the `logTiming` option is on;
   * zero-overhead no-op otherwise. Mirrors the Salsify data connector.
   */
  private async withTiming<T>(
    fn: () => Promise<T>,
    label: string
  ): Promise<T> {
    if (!this.isFlagOn('logTiming')) {
      return fn();
    }
    const now = this.monotonicNow();
    const start = now();
    try {
      const result = await fn();
      const seconds = ((now() - start) / 1000).toFixed(3);
      this.runtime.logError(`[Salsify Media][Timing] ${label} took ${seconds}s`);
      return result;
    } catch (error) {
      const seconds = ((now() - start) / 1000).toFixed(3);
      this.runtime.logError(
        `[Salsify Media][Timing] ${label} failed after ${seconds}s`
      );
      throw error;
    }
  }

  private monotonicNow(): () => number {
    return typeof performance !== 'undefined' &&
      typeof performance.now === 'function'
      ? () => performance.now()
      : () => Date.now();
  }

  private isFlagOn(name: string): boolean {
    const raw = this.runtime.options[name];
    if (typeof raw === 'boolean') return raw;
    return typeof raw === 'string' && raw.trim().toLowerCase() === 'true';
  }

  private requireOption(key: string): string {
    const value = this.runtime.options[key];
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(
        `Salsify media connector: runtime option "${key}" is required.`
      );
    }
    return value;
  }
}
