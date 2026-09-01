import { Connector } from '@chili-publish/studio-connectors';

/**
 * Normalise an arbitrary path string to a GraFx-compatible forward-slash
 * path that always starts with `/` and never ends with `/` (unless root).
 */
export function formatPath(path: string): string {
  path = path.trim();

  if (path.length === 0) {
    return '/';
  }

  // Decode URL encoding if present (safe to call on already-decoded strings)
  path = decodeURIComponent(path);

  // Ensure leading slash, collapse backslashes and duplicate slashes
  path = ('/' + path).replace(/\\/g, '/').replace(/\/+/g, '/');

  // Remove trailing slash (unless root)
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }

  return path;
}

export function getUploadFolder(context: Connector.Dictionary): string {
  const uploadFolder = context['uploadFolder'] as string | undefined;
  return formatPath(
    uploadFolder && uploadFolder.trim().length > 0
      ? uploadFolder.trim()
      : '/Upload'
  );
}

export function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string' && value.length > 0) {
    return value.toLowerCase() === 'true';
  }
  return undefined;
}
