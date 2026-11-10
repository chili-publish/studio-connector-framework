// ─── Lytho API Types ──────────────────────────────────────────────────────────

export interface LythoTag {
  id: string;
  name: string;
}

// Shape of GET /assets/grafx/assets/{id}: a DAM asset or an image uploaded to a publication. `width` and
// `height` are null and `tags` is empty for an upload.
export interface LythoAssetTag {
  name: string;
}

export interface LythoAsset {
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
export interface ConnectorSearchHit {
  id: string;
  name: string;
  fileName: string;
  extension: string;
  fileType: string;
  width: number | null;
  height: number | null;
  tags: LythoTag[];
}

export interface ConnectorSearchResponse {
  totalHits: number;
  from: number;
  size: number;
  hits: ConnectorSearchHit[];
}
