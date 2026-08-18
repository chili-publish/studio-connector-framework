import { readInitialSettings } from '../../core/connectorSettingsStorage';
import { MemoryStorage } from '../../core/storage';
import { metricsCollector } from '../metricsCollector';

export type CachedBinary = {
  data: ArrayBuffer;
  contentType: string;
};

const imageCache = new MemoryStorage();

export interface Header {
  name: string;
  value: string;
}

export type HttpParams = {
  authorization: string;
  globalHeaders: Header[];
  globalQueryParams: URLSearchParams;
};

export type ConnectorSettings = {
  httpParams: HttpParams;
  runtimeOptions: Record<string, unknown>;
};

const IMAGE_CACHE_TIMEOUT_MS = 10_000;

const connectorSettings: ConnectorSettings = {
  httpParams: {
    authorization: '',
    globalHeaders: [],
    globalQueryParams: new URLSearchParams(),
  },
  runtimeOptions: {},
};

let connectorLoad: Promise<any> | null = null;

export function updateConnectorSettings(next: ConnectorSettings) {
  connectorSettings.httpParams = next.httpParams;

  for (const key of Object.keys(connectorSettings.runtimeOptions)) {
    delete connectorSettings.runtimeOptions[key];
  }
  Object.assign(connectorSettings.runtimeOptions, next.runtimeOptions);
}

export async function getImageFromCache(
  id: string,
  timeoutMs = IMAGE_CACHE_TIMEOUT_MS
): Promise<CachedBinary> {
  const existing = imageCache.getItem<CachedBinary>(id);
  if (existing) {
    return existing;
  }

  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const entry = imageCache.getItem<CachedBinary>(id);
      if (entry) {
        clearInterval(interval);
        resolve(entry);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        clearInterval(interval);
        reject(new Error(`Timed out waiting for cache entry "${id}"`));
      }
    }, 100);
  });
}

function isBinaryType(contentType?: string | null) {
  return (
    contentType?.includes('image/') ||
    contentType?.includes('font/') ||
    contentType?.includes('application/pdf')
  );
}

export async function initRuntime() {
  if (connectorLoad) {
    return connectorLoad;
  }

  const load = loadConnector();
  connectorLoad = load;
  try {
    return await load;
  } catch (error) {
    if (connectorLoad === load) {
      connectorLoad = null;
    }
    throw error;
  }
}

async function loadConnector() {
  const fetch = async (url: string, options: any) => {
    const { authorization, globalHeaders, globalQueryParams } =
      connectorSettings.httpParams;
    const method = options?.method ?? 'GET';
    const authHeader = authorization ? { Authorization: authorization } : {};
    const headers = {
      ...options.headers,
      ...globalHeaders.reduce(
        (acc, curr) => ({ ...acc, [curr.name]: curr.value }),
        {}
      ),
      ...authHeader,
    };
    const urlInstance = new URL(url);

    if (globalQueryParams.size > 0) {
      urlInstance.search = new URLSearchParams([
        ...Array.from(urlInstance.searchParams.entries()),
        ...Array.from(globalQueryParams.entries()),
      ]).toString();
    }

    const requestUrl = urlInstance.toString();
    const start = performance.now();

    try {
      const response = await window.fetch(urlInstance, { ...options, headers });

      const contentType = response.headers.get('content-type');
      if (isBinaryType(contentType)) {
        const arrayBuffer = await response.arrayBuffer();
        const id = Math.random().toString(36).substring(7);
        imageCache.setItem(id, {
          data: arrayBuffer,
          contentType: contentType ?? 'application/octet-stream',
        });
        // We couldn't make a ... copy of response object as it is not iterable
        (response as any)['arrayBuffer'] = {
          id: id,
          bytes: arrayBuffer.byteLength,
        };
        metricsCollector.recordFetch({
          url: requestUrl,
          method,
          status: response.status,
          durationMs: performance.now() - start,
          success: response.ok,
        });
        return response;
      } else {
        const text = await response.text();
        // We couldn't make a ... copy of response object as it is not iterable
        (response as any)['text'] = text;
        metricsCollector.recordFetch({
          url: requestUrl,
          method,
          status: response.status,
          durationMs: performance.now() - start,
          success: response.ok,
        });
        return response;
      }
    } catch (error) {
      metricsCollector.recordFetch({
        url: requestUrl,
        method,
        durationMs: performance.now() - start,
        success: false,
        error: `${error}`,
      });
      throw error;
    }
  };

  // get the current base url and append connector.js to it
  // When in dev mode use GraFx connector
  const url = import.meta.env.DEV
    ? 'https://stgrafxstudiodevpublic.blob.core.windows.net/editor/1.4.1/web/assets/packages/runtime_assets/assets/connectors/grafx_media/code.js'
    : `${window.location.origin}/connector.js`;
  // fetch the connector js code as a module
  const ConnectorClass = (await import(/* @vite-ignore */ url)).default;
  updateConnectorSettings(readInitialSettings(ConnectorClass.name));

  const runtime = {
    options: connectorSettings.runtimeOptions,
    logError: console.error,
    platform: {},
    sdkVersion: '1.0.0',
    fetch: fetch,
  };

  return new ConnectorClass(runtime);
}
