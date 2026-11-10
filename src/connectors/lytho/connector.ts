import { Connector, Media } from '@chili-publish/studio-connectors';
import { toMedia, toMediaDetail } from './lib/mapping';
import { selectVariant } from './lib/rendition';
import type { ConnectorSearchResponse, LythoAsset } from './lib/types';

// CHILI GraFx-supported asset file types (per docs.chiligrafx.com/GraFx-Media/overview/filetypes).
// Sent with the search request to filter search/browse results to assets CHILI can use. This does
// not constrain direct id lookups — detail() and the query() ObjectID intercept resolve a known
// asset regardless of extension; browse filtering is what prevents placing unsupported types.
// The search API matches extensions case-sensitively, so each format is listed in both lower- and
// upper-case; `jpeg`/`tiff` are the `jpg`/`tif` synonyms.
// NOTE: mixed-case extensions (e.g. `.Tif`) are still missed.
const SUPPORTED_FILE_FORMATS = [
  'eps',
  'jpg',
  'jpeg',
  'pdf',
  'png',
  'psd',
  'tif',
  'tiff',
  'ai',
];
const SUPPORTED_EXTENSIONS = SUPPORTED_FILE_FORMATS.flatMap((ext) => [
  ext,
  ext.toUpperCase(),
]);

// ─── Connector Implementation ─────────────────────────────────────────────────

export default class LythoMediaConnector implements Media.MediaConnector {
  private runtime: Connector.ConnectorRuntimeContext;

  constructor(runtime: Connector.ConnectorRuntimeContext) {
    this.runtime = runtime;
  }

  async query(
    options: Connector.QueryOptions,
    context: Connector.Dictionary
  ): Promise<Media.MediaPage> {
    const baseUrl = this._getBaseUrl();
    const from = parseInt(String(options.pageToken ?? '0')) || 0;
    const pageSize = options.pageSize ?? 20;
    const terms = options.filter?.join(' ') ?? '';

    // Studio resolves saved assets by calling query(size=1, terms=assetId).
    // Lytho's full-text search does not accept asset IDs as search terms, so intercept this
    // pattern and fetch the asset directly via the detail endpoint.
    if (pageSize === 1 && /^[0-9a-f]{24}$/i.test(terms.trim())) {
      const result = await this.runtime.fetch(
        `${baseUrl}/assets/grafx/assets/${encodeURIComponent(terms.trim())}`,
        { method: 'GET' }
      );
      if (!result.ok) {
        throw new ConnectorHttpError(
          result.status,
          `Lytho: Asset lookup failed ${result.status} ${result.statusText}`
        );
      }
      const asset = JSON.parse(result.text) as LythoAsset;
      return {
        pageSize: 1,
        data: [toMedia(asset)],
        links: { nextPage: '' },
      };
    }

    // Tenant is resolved server-side from the authenticated user (realm/token); the connector
    // sends only the filters it uses. The full search request is built server-side by the Lytho search API.
    const collectionId =
      options.collection && options.collection !== '/'
        ? options.collection
        : null;

    const body = {
      terms,
      collectionId,
      from,
      size: pageSize,
      extensions: SUPPORTED_EXTENSIONS,
    };

    const result = await this.runtime.fetch(
      `${baseUrl}/search/grafx/api/v1/search`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!result.ok) {
      throw new ConnectorHttpError(
        result.status,
        `Lytho: Query failed ${result.status} ${result.statusText}`
      );
    }

    const json = JSON.parse(result.text) as ConnectorSearchResponse;
    const hits = json.hits ?? [];
    const totalHits = json.totalHits ?? 0;
    const nextFrom = from + pageSize;

    return {
      pageSize,
      data: hits.map(toMedia),
      links: {
        nextPage: nextFrom < totalHits ? String(nextFrom) : '',
      },
    };
  }

  async detail(
    id: string,
    context: Connector.Dictionary
  ): Promise<Media.MediaDetail> {
    const baseUrl = this._getBaseUrl();

    // Metadata read uses the `/assets/grafx/assets/{id}` endpoint, the same family as the byte downloads
    // (see download()). It answers for a DAM asset and for an image a user uploaded to a publication, which
    // is not a DAM asset, so the core `/assets/assets/{id}` endpoint cannot be used here.
    const result = await this.runtime.fetch(
      `${baseUrl}/assets/grafx/assets/${encodeURIComponent(id)}`,
      { method: 'GET' }
    );

    if (!result.ok) {
      throw new ConnectorHttpError(
        result.status,
        `Lytho: Detail failed ${result.status} ${result.statusText}`
      );
    }

    const asset = JSON.parse(result.text) as LythoAsset;
    return toMediaDetail(asset);
  }

  async download(
    id: string,
    previewType: Media.DownloadType,
    intent: Media.DownloadIntent,
    context: Connector.Dictionary
  ): Promise<Connector.ArrayBufferPointer> {
    const baseUrl = this._getBaseUrl();

    const variant = await selectVariant(previewType, intent, () =>
      this._getExtension(id)
    );
    // Byte downloads use `/assets/grafx/assets/{id}/{variant}`, the endpoint family purpose-built for the
    // connector to stream asset bytes directly instead of following Lytho's usual pre-signed download links.
    // Metadata reads (detail(), and the query() id lookup) use the same family without a variant,
    // `/assets/grafx/assets/{id}`.
    const path = `/assets/grafx/assets/${encodeURIComponent(id)}/${variant}`;

    const result = await this.runtime.fetch(`${baseUrl}${path}`, {
      method: 'GET',
    });
    if (!result.ok) {
      throw new ConnectorHttpError(
        result.status,
        `Lytho: Download failed ${result.status} ${result.statusText}`
      );
    }
    return result.arrayBuffer;
  }

  getConfigurationOptions(): Connector.ConnectorConfigValue[] | null {
    // LYTHO_BASE_URL is a runtime option configured at deploy time — no per-instance configuration
    // options are needed. Do not add any: they surface as per-variable fields in CHILI's template designer.
    return null;
  }

  getCapabilities(): Media.MediaConnectorCapabilities {
    return {
      query: true,
      detail: true,
      filtering: true,
      metadata: true,
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private _getBaseUrl(): string {
    // Named LYTHO_BASE_URL rather than the generic BASE_URL so Lytho's applications can recognise this
    // connector by its option name. Keep the name unique to Lytho.
    const baseUrl = this.runtime.options['LYTHO_BASE_URL'];
    if (typeof baseUrl !== 'string' || baseUrl.trim().length === 0) {
      return '';
    }
    return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  }

  // Resolve an asset's file extension (lower-cased) for download-variant routing. download() is
  // handed only the id, so the extension — needed to decide PNG/JPEG-vs-convert for web fullres —
  // is read from the metadata endpoint. Same `/assets/grafx/assets/{id}` read that detail() performs.
  private async _getExtension(id: string): Promise<string> {
    const baseUrl = this._getBaseUrl();
    const result = await this.runtime.fetch(
      `${baseUrl}/assets/grafx/assets/${encodeURIComponent(id)}`,
      { method: 'GET' }
    );
    if (!result.ok) {
      throw new ConnectorHttpError(
        result.status,
        `Lytho: Asset lookup failed ${result.status} ${result.statusText}`
      );
    }
    const asset = JSON.parse(result.text) as LythoAsset;
    return (asset.extension ?? '').toLowerCase();
  }
}
