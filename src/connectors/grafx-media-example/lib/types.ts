/** EntityType from the GraFx Environment API (Swagger: EntityType enum) */
export type GrafxEntityType = 'Item' | 'Directory' | string | number | null;

/** Asset schema from GET /media and GET /media/{mediaId} (Swagger: Asset) */
export interface GrafxAsset {
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
export interface GrafxAssetPagedResponse {
  data: GrafxAsset[] | null;
  pageSize: number;
  links: Record<string, string> | null;
  total: number | null;
}

export interface GrafxAssetDetailResponse {
  data: GrafxAsset | null;
  links: Record<string, string> | null;
}
