import { Media } from '@chili-publish/studio-connectors';
import type { ConnectorSearchHit, LythoAsset } from './types';

// Maps a search hit or an asset read by id to a GraFx media item. Both shapes
// carry the same fields used here, so browse results and id lookups map alike.
export function toMedia(asset: LythoAsset | ConnectorSearchHit): Media.Media {
  return {
    id: asset.id,
    name: asset.name,
    relativePath: '/' + asset.id,
    type: 0,
    extension: asset.extension ?? '',
    metaData: {
      fileType: asset.fileType ?? '',
      tags: asset.tags?.map((t) => t.name).join(', ') ?? '',
    },
  };
}

// Maps an asset read by id to a GraFx media detail, which adds the dimensions
// and the file name to what toMedia() returns.
export function toMediaDetail(asset: LythoAsset): Media.MediaDetail {
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
