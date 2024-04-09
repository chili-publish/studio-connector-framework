export const cache = new Map<string, ArrayBuffer>();

export interface Header {
  name: string;
  value: string;
}

export async function getImageFromCache(id: string): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      const arrayBuffer = cache.get(id);
      if (arrayBuffer) {
        clearInterval(interval);
        resolve(arrayBuffer);
      }
    }, 100);
  });
}

export async function initRuntime(
  globalHeaders: Header[],
  runtimeOptions: Record<string, unknown>,
  authorization: Header
) {
  // proxy the fetch function to be able to inject headers
  const fetch = async (url: string, options: any) => {
    const headers = {
      ...options.headers,
      ...globalHeaders.reduce(
        (acc, curr) => ({ ...acc, [curr.name]: curr.value }),
        {}
      ),
      [authorization.name]: authorization.value,
    };
    const response = await window.fetch(url, { ...options, headers });

    // if binary file, add arrayBufferPointer property
    if (response.headers.get('content-type')?.includes('json')) {
      const text = await response.text();
      // We couldn't make a ... copy of response object as it is not iterable
      (response as any)['text'] = text;
      return response;
    } else {
      const arrayBuffer = await response.arrayBuffer();
      const id = Math.random().toString(36).substring(7);
      cache.set(id, arrayBuffer);
      // We couldn't make a ... copy of response object as it is not iterable
      (response as any)['arrayBuffer'] = {
        id: id,
        bytes: arrayBuffer.byteLength,
      };
      return response;
    }
  };

  const runtime = {
    options: runtimeOptions,
    logError: console.error,
    platform: {},
    sdkVersion: '1.0.0',
    fetch: fetch,
  };

  // get the current base url and append connector.js to it
  // When in dev mode use GraFx connector
  const url = import.meta.env.DEV
    ? 'https://stgrafxstudiodevpublic.blob.core.windows.net/editor/1.4.1/web/assets/packages/runtime_assets/assets/connectors/grafx_media/code.js'
    : `${window.location.origin}/connector.js`;
  // fetch the connector js code as a module
  const mod = await import(/* @vite-ignore */ url);
  // get the default export from the module
  const connector = new mod.default(runtime);

  return connector;
}
