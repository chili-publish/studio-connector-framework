import { Connector, Media } from '@chili-publish/studio-connectors';
import type { AssetId, DAMCustomMetadataPage, DamMedia } from './types';

export function getMediaDetailFromDamMedia(damMedia: DamMedia, customMetadata: DAMCustomMetadataPage): Media.MediaDetail {
  const assetId: AssetId = {
    id: damMedia.id.toString(),
    name: damMedia.name,
    assetHash: damMedia.assetHash,
    tenantHash: damMedia.tenantHash,
    thumbnail: damMedia.thumbnail,
    extension: damMedia.format,
  };

  return {
    // We save all information required for 'download` under id to avoid details call
    id: JSON.stringify(assetId),
    name: damMedia.title,
    relativePath: 'Media',
    type: 0,
    metaData: getMetadataFromDamMedia(damMedia, customMetadata),
    extension: damMedia.format,
    width: damMedia.width,
    height: damMedia.height,
  };
}

export function getMetadataFromDamMedia(damMedia: DamMedia, customMetadata: DAMCustomMetadataPage): Connector.Dictionary {
  const attributeNames: Array<string> = customMetadata['hydra:member'].map((m) => m.attributeName);

  return Object.fromEntries(attributeNames.filter((a) => ['string', 'number'].includes(typeof damMedia[a])).map((a) => [a, damMedia[a].toString()]));
}
