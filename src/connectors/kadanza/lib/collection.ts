import { Media } from '@chili-publish/studio-connectors';
import type { DamCategory } from './types';

export function toPathSegments(collection?: string): Array<string> {
  if (!collection) {
    return [];
  }

  return collection.split('/').filter((segment) => segment.length > 0);
}

export function toRelativePath(segments: Array<string>): string {
  return segments.length === 0 ? '/' : `/${segments.join('/')}/`;
}

export function categoryToFolderMedia(category: DamCategory, relativePath: string): Media.Media {
  return {
    id: String(category.id),
    name: category.name,
    relativePath,
    type: 1,
    metaData: {},
    extension: '',
  };
}
