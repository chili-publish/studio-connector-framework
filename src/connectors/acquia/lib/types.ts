export interface AcquiaAssetV2 {
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

export interface GetAssetsResponse {
  items: Array<AcquiaAssetV2>;
}

export interface AssetId {
  id: string;
  eid: string;
  filename: string;
  fileType: 'image' | 'pdf' | unknown;
  width?: number;
  height?: number;
}
