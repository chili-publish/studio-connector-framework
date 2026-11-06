import { Connector, Media } from '@chili-publish/studio-connectors';

// ─── Lytho API Types ──────────────────────────────────────────────────────────

interface LythoTag {
  id: string;
  name: string;
}

// Shape of GET /assets/grafx/assets/{id}: a DAM asset or an image uploaded to a publication. `width` and
// `height` are null and `tags` is empty for an upload.
interface LythoAssetTag {
  name: string;
}

interface LythoAsset {
  id: string;
  name: string;
  fileName: string;
  extension: string;
  fileType: string;
  width: number | null;
  height: number | null;
  tags: LythoAssetTag[];
}

// Slim, connector-owned shape returned by POST /search/grafx/api/v1/search. Decoupled from Lytho's
// internal search models.
interface ConnectorSearchHit {
  id: string;
  name: string;
  fileName: string;
  extension: string;
  fileType: string;
  width: number | null;
  height: number | null;
  tags: LythoTag[];
}

interface ConnectorSearchResponse {
  totalHits: number;
  from: number;
  size: number;
  hits: ConnectorSearchHit[];
}

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

// GraFx expects PNG/JPEG for on-screen (web) display. Assets already in these formats are
// served as their original bytes; any other supported type (EPS/PDF/PSD/TIFF/AI) is served
// as the DAM's rasterized `hrpreview` twin so the canvas can decode it. Matched case-insensitively
// — the DAM stores `extension` as a case-sensitive keyword, so `.JPG`/`.Png` must be lower-cased first.
const WEB_NATIVE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg']);

// Per-intent allowlists of the types CHILI can ingest as raw original bytes. Anything outside an
// intent's set is rerouted to a rendition that intent's pipeline can read. Per CHILI's Media
// Connector docs, `fullres`/`print` takes PNG/JPEG/PDF ("for asset types other than PNG / JPEG /
// PDF one should serve the asset wrapped as a PDF file") and `fullres`/`animation` takes PNG/JPEG
// ("for asset types other than PNG / JPEG" serve it converted). So print reroutes to the DAM's
// on-demand `pdf` rendition; animation reroutes to the rasterized `hrpreview` twin.
//
// AI and PDF are print-native but NOT animation-native. The PDF export engine ingests both
// directly, while the animation renderer fails on their raw bytes, so the two intents keep
// separate sets rather than sharing one list of types to reroute.
//
// An extension in neither set is treated as non-native and rerouted rather than passed through:
// handing CHILI bytes it cannot decode is the failure this routing exists to prevent. That case is
// only reachable for an asset referenced by id in an existing template — query() filters browse to
// SUPPORTED_EXTENSIONS, so one cannot be picked.
//
// Matched case-insensitively: `extension` is stored as a case-sensitive value, so `.EPS` and `.Tif`
// must be lower-cased before lookup.
const PRINT_NATIVE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'pdf', 'ai']);
const ANIMATION_NATIVE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg']);

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
        data: [
          {
            id: asset.id,
            name: asset.name,
            relativePath: '/' + asset.id,
            type: 0,
            extension: asset.extension ?? '',
            metaData: {
              fileType: asset.fileType ?? '',
              tags: asset.tags?.map((t) => t.name).join(', ') ?? '',
            },
          },
        ],
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
      data: hits.map((h) => this._searchHitToMedia(h)),
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

    return {
      id: asset.id,
      name: asset.name,
      relativePath: '/' + asset.id,
      type: 0,
      extension: asset.extension ?? '',
      width: asset.width ?? undefined,
      height: asset.height ?? undefined,
      metaData: {
        fileType: asset.fileType ?? '',
        fileName: asset.fileName ?? '',
        tags: asset.tags?.map((t) => t.name).join(', ') ?? '',
      },
    };
  }

  async download(
    id: string,
    previewType: Media.DownloadType,
    intent: Media.DownloadIntent,
    context: Connector.Dictionary
  ): Promise<Connector.ArrayBufferPointer> {
    const baseUrl = this._getBaseUrl();

    let variant: string;
    switch (previewType) {
      case 'thumbnail':
        variant = 'preview';
        break;
      case 'mediumres':
        variant = 'hrpreview';
        break;
      case 'highres': {
        if (intent === 'web') {
          // Loaded into editor frames for on-screen display. GraFx expects a decodable raster
          // (PNG/JPEG) here for every file type — it has no "serve original" carve-out — so web
          // always serves the rasterized twin, no type lookup needed.
          variant = 'hrpreview';
          break;
        }
        // print / animation. The contract asks for a high-quality image, but routing *every* type
        // here would downscale a 4000px JPEG that exports correctly today, so stay type-aware:
        // only the types that intent cannot ingest are rerouted. Same native sets as `fullres`,
        // so a type never changes ingestibility between the two tiers — the tier only changes
        // what the fallback is (`hrpreview` here; `fullres`/print falls back to `pdf`).
        //
        // DEFENSIVE. Studio has not been observed requesting `highres` on any intent — the display
        // path uses `mediumres`/`web`. These branches cost nothing and the contract permits the
        // tier, but the behaviour is unobserved rather than confirmed.
        const ext = await this._getExtension(id);
        const nativeExtensions =
          intent === 'print'
            ? PRINT_NATIVE_EXTENSIONS
            : ANIMATION_NATIVE_EXTENSIONS;
        variant = nativeExtensions.has(ext) ? 'content' : 'hrpreview';
        break;
      }
      case 'fullres': {
        // download() isn't handed the file type, so look it up — one extra metadata call per
        // fullres download. Accepted cost; revisit only if this ever proves to be a hot path.
        const ext = await this._getExtension(id);
        if (intent === 'web') {
          // Serve PNG/JPEG originals as-is; anything else becomes the rasterized twin so the
          // canvas can decode it.
          variant = WEB_NATIVE_EXTENSIONS.has(ext) ? 'content' : 'hrpreview';
        } else if (intent === 'print') {
          // CHILI's PDF export engine ingests only PNG/JPEG/PDF, so PDF and AI pass through as
          // their original bytes. Everything else gets the DAM's on-demand PDF rendition. If
          // conversion fails the DAM degrades to raster server-side and still returns 200 — there
          // is nothing for the connector to retry or detect.
          variant = PRINT_NATIVE_EXTENSIONS.has(ext) ? 'content' : 'pdf';
        } else {
          // animation: the contract wants PNG/JPEG, and `hrpreview` is exactly that. Note the
          // narrower native set — PDF and AI pass through on print but not here, because the
          // animation renderer fails on those raw bytes.
          variant = ANIMATION_NATIVE_EXTENSIONS.has(ext)
            ? 'content'
            : 'hrpreview';
        }
        break;
      }
      // 'original' → full-resolution original bytes, every intent.
      //
      // Deliberately NOT intent-aware, unlike `highres`/`fullres` above. `original` means the
      // original file; rerouting it to a rendition would make the one tier with an unambiguous
      // contract lie about what it returns.
      //
      // If Studio is ever seen requesting `original` for animation and failing on a PDF, that is
      // a contract question to settle rather than another reroute to add here.
      default:
        variant = 'content';
        break;
    }
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

  private _searchHitToMedia(hit: ConnectorSearchHit): Media.Media {
    return {
      id: hit.id,
      name: hit.name,
      relativePath: '/' + hit.id,
      type: 0,
      extension: hit.extension ?? '',
      metaData: {
        fileType: hit.fileType ?? '',
        tags: hit.tags?.map((t) => t.name).join(', ') ?? '',
      },
    };
  }
}
