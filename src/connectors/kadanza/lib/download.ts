import { Media } from '@chili-publish/studio-connectors';
import type { AssetId } from './types';

export function resolveDownloadPath(
  detail: AssetId,
  previewType: Media.DownloadType,
  intent: Media.DownloadIntent
): string {
  const format = detail.extension.toLowerCase();
  const cdnBasePath = `/cdn/${detail.tenantHash}/${detail.assetHash}/${encodeURIComponent(detail.name)}`;
  const original = `${cdnBasePath}/original`;
  const isTiff = ['tif', 'tiff'].includes(format);
  const isPdf = format === 'pdf';
  const isOutputPreview = previewType === 'fullres' || previewType === 'highres';

  if (isPdf && intent === 'print' && isOutputPreview) {
    return `${cdnBasePath}/pdf-wrap`;
  }

  if (isTiff && isOutputPreview) {
    return requireThumbnailPath(detail);
  }

  if (
    previewType === 'original' ||
    previewType === 'fullres' ||
    (previewType === 'highres' && ['png', 'jpeg', 'jpg'].includes(format))
  ) {
    return original;
  }

  return requireThumbnailPath(detail);
}

export function requireThumbnailPath(detail: AssetId): string {
  if (!detail.thumbnail) {
    throw new Error(`Thumbnail not available for asset with id ${detail.id}`);
  }

  return detail.thumbnail;
}
