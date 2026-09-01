import { Media } from '@chili-publish/studio-connectors';
import type {
  GrafxAsset,
  GrafxAssetDetailResponse,
  GrafxAssetPagedResponse,
} from './types';

export function isFolderEntityType(entityType: unknown): boolean {
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

export function assetToMedia(asset: GrafxAsset): Media.Media {
  const isFolder = isFolderEntityType(asset.type);
  return {
    id: asset.id,
    name: asset.name ?? '',
    relativePath: asset.relativePath ?? '',
    type: isFolder ? 1 : 0,
    metaData: asset.metaData ?? {},
    extension: asset.extension ?? '',
  };
}

export function assetToMediaDetail(asset: GrafxAsset): Media.MediaDetail {
  const isFolder = isFolderEntityType(asset.type);
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

/**
 * Convert a raw `GrafxAssetPagedResponse` to the `Media.MediaPage` shape.
 * Directory assets have their name appended to `relativePath` so the full
 * path is available on the item (mirrors the original _formatRelativePath).
 */
export function toMediaPage(json: GrafxAssetPagedResponse): Media.MediaPage {
  const data = (json.data ?? []).map((asset) => {
    if (isFolderEntityType(asset.type)) {
      const newRelativePath = `${asset.relativePath ?? ''}/${
        asset.name ?? ''
      }`.replace(/\/\//g, '/');
      asset = { ...asset, relativePath: newRelativePath };
    }
    return assetToMedia(asset);
  });

  return {
    pageSize: json.pageSize,
    links: {
      nextPage: json.links?.['nextPage'] ?? '',
    },
    data,
  };
}

export function extractAssetFromDetailResponse(
  payload: GrafxAsset | GrafxAssetDetailResponse
): GrafxAsset {
  const maybeWrappedResponse = payload as GrafxAssetDetailResponse;
  if (
    maybeWrappedResponse?.data &&
    typeof maybeWrappedResponse.data === 'object'
  ) {
    return maybeWrappedResponse.data;
  }

  return payload as GrafxAsset;
}
