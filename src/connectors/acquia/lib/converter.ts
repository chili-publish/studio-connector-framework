import { Connector, Media } from '@chili-publish/studio-connectors';
import type { AcquiaAssetV2, AssetId } from './types';

export class Converter {
  static assetToMedia(item: AcquiaAssetV2): Media.Media {
    const { width, height } = item.file_properties.image_properties ?? {};
    const assetId: AssetId = {
      id: item.id,
      eid: item.external_id,
      filename: item.filename,
      fileType: item.file_properties.format_type.toLowerCase(),
      width,
      height,
    };
    return {
      id: JSON.stringify(assetId),
      name: item.filename,
      // TODO: to be defined
      relativePath: '/',
      // 0 - file
      // 1 - folder
      type: 0,
      extension: Converter.formatToExtension(item.file_properties.format),
      metaData: Object.entries(item.metadata.fields).reduce(
        (metadata, [fieldKey, fieldValue]) => {
          metadata[fieldKey] = Array.isArray(fieldValue)
            ? fieldValue[0]
            : fieldValue;
          return metadata;
        },
        {} as Connector.Dictionary
      ),
    };
  }

  static assetToMediaDetail(item: AcquiaAssetV2): Media.MediaDetail {
    const { width, height } = item.file_properties.image_properties ?? {};
    const media = this.assetToMedia(item);
    return {
      ...media,
      width,
      height,
    };
  }

  static formatToExtension(format: string): string {
    // Acquia identifies Pdf files with following format but we need file extenstion type
    if (format === 'PdfDocument') {
      return 'pdf';
    }
    return format.toLowerCase();
  }
}
