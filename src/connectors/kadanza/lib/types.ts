export interface DamMedia {
  id: number;
  name: string;
  thumbnail: string;
  format: string;
  width: number;
  height: number;
  size: number;
  assetHash: string;
  tenantHash: string;
  fileName: string;
  title: string;
  createdBy: {
    id: number;
    userName: string;
    firstName: string;
    lastName: string;
  }
}

export interface DamMediaPage {
  'hydra:totalItems': number;
  'hydra:itemsPerPage': number;
  'hydra:currentPage': number;
  'hydra:totalPages': number;
  'hydra:member': Array<DamMedia>;
}

export interface AssetId {
  id: string;
  name: string;
  assetHash: string;
  tenantHash: string;
  thumbnail: string;
  extension: string;
}

export interface DAMCustomMetadata {
  id: number;
  name: string;
  label: string;
  type: string;
  defaultValue: string;
  required: boolean;
  default: boolean;
  readOnly: boolean;
  visible: boolean;
  sorting: boolean;
  sort: number;
  dropdownOptions: object;
  title: string;
  text: string;
  deletedAt: string;
  filterable: boolean;
  sortable: boolean;
  attributeName: string;
}

export interface DAMCustomMetadataPage {
  'hydra:totalItems': number;
  'hydra:itemsPerPage': number;
  'hydra:currentPage': number;
  'hydra:totalPages': number;
  'hydra:member': Array<DAMCustomMetadata>;
}

export interface DamCategory {
  id: number;
  name: string;
  parent: number | null;
  categories_count?: number;
  assets_count?: number;
}

export interface DamCategoryPage {
  'hydra:totalItems': number;
  'hydra:itemsPerPage': number;
  'hydra:currentPage': number;
  'hydra:totalPages': number;
  'hydra:member': Array<DamCategory>;
}

export type CollectionResolution =
  | { kind: 'notFound' }
  | { kind: 'groupRoot'; categories: Array<DamCategory> }
  | { kind: 'category'; categoryId: string; segments: Array<string> };
