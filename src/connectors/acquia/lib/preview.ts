import { Media } from '@chili-publish/studio-connectors';
import type { AssetId } from './types';

export function ensureTrailingSlash(url: string) {
  if (!url) return '';
  return url.endsWith('/') ? url : url + '/';
}

export function tryThumbnail(id: string) {
  const { thumbnails } = JSON.parse(id) as {
    thumbnails: { '600px': { url: string } } | undefined;
  };
  let thumbnail = thumbnails?.['600px'];

  if (!thumbnail && thumbnails) {
    // take the last property of thumbnails for given asset
    const keys = Object.keys(thumbnails);
    thumbnail = thumbnails[keys[keys.length - 1]];
  }
  return thumbnail?.url;
}

export function buildPreviewUrl(
  id: string,
  previewBaseUrl: string,
  {
    previewType,
    intent,
  }: { previewType: Media.DownloadType; intent: Media.DownloadIntent }
) {
  const { eid, filename, fileType, ...size } = JSON.parse(id) as AssetId;
  let endpoint =
    ensureTrailingSlash(previewBaseUrl) + 'content/' + eid;

  switch (previewType) {
    case 'thumbnail': {
      endpoint += '/jpeg' + '/' + filename + getPreviewSize(size, 125);
      break;
    }
    case 'mediumres': {
      endpoint += '/png' + '/' + filename + getPreviewSize(size, 400);
      break;
    }
    case 'highres':
      endpoint += '/png' + '/' + filename + getPreviewSize(size, 1024);
      break;
    case 'fullres':
      if (intent === 'print' && (fileType === 'image' || fileType === 'pdf')) {
        // TODO: Uncomment after https://chilipublishintranet.atlassian.net/browse/GRAFX-3314
        // endpoint += '/original' + '/' + filename + '?download=true';
        endpoint += '/png' + '/' + filename;
      } else {
        endpoint += '/png' + '/' + filename;
      }
      break;
    case 'original':
      endpoint += '/original' + '/' + filename + '?download=true';
      break;
    default:
      endpoint += '/png' + '/' + filename + getPreviewSize(size, 400);
  }
  return endpoint;
}

function getPreviewSize(
  original: { width?: number; height?: number },
  max: 125 | 400 | 1024
) {
  const { width, height } = original;

  // For landscape images, to keep aspect ratio, only specify width
  if (width > height) {
    const targetWidth = width < max ? width : max;
    return `?w=${targetWidth}`;
  }

  // For portrait images, to keep aspect ratio, only specify height
  if (height > width) {
    const targetHeight = height < max ? height : max;
    return `?h=${targetHeight}`;
  }

  return `?w=${max}&h=${max}`;
}
