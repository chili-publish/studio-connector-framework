import { Header } from '../state/Context';
import { BASE_URL, PROXY_HOSTS } from './config';

export const cache = new Map<string, ArrayBuffer>();

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

export async function initRuntime(globalHeaders: Header[]) {
  // proxy the fetch function to be able to inject headers
  const fetch = async (url: string, options: RequestInit) => {
    const headers = {
      ...(options.headers as unknown as Record<string, string>),
      ...globalHeaders.reduce(
        (acc, curr) => ({ ...acc, [curr.HttpHeader]: curr.HttpValue }),
        {}
      ),
    };
    // TODO: Take a look at built-in solutions of create react app via dev server
    const shouldProxy = PROXY_HOSTS.some((proxy) => {
      return url.match(proxy);
    });
    let response;
    // TODO: doesn't work yet
    // if (shouldProxy) {
    //   // To avoid CORS issues we proxy image request via debug backend
    //   response = await window.fetch(
    //     '/image?requestUrl=' + window.encodeURI(url),
    //     {
    //       method: 'GET',
    //     }
    //   );
    // } else {
    response = await window.fetch(url, { ...options, headers });
    // }

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
    options: {
      BASE_URL,
    },
    logError: console.error,
    platform: {},
    sdkVersion: '1.0.0',
    fetch: fetch,
  };

  // const dynamicImport = new Function('url', `return import(url)`);
  // get the current base url and append connector.js to it
  const url = `${window.location.origin}/connector.js`;
  // fetch the connector js code as a module
  const mod = await import(url);
  // get the default export from the module
  const connector = new mod.default(runtime);

  return connector;
}
