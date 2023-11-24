export const cache = new Map<string, ArrayBuffer>();

export interface Header {
    HttpHeader: string;
    HttpValue: string;
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

export async function initRuntime(globalHeaders: Header[]) {
  // proxy the fetch function to be able to inject headers
  const fetch = async (url: string, options: any) => {
    const headers = {
      ...options.headers,
      ...globalHeaders.reduce(
        (acc, curr) => ({ ...acc, [curr.HttpHeader]: curr.HttpValue }),
        {}
      ),
    };
    const response = await window.fetch(url, { ...options, headers });

    // if binary file, add arrayBufferPointer property
    if (response.headers.get('content-type')?.includes('json')) {
      return response;
    } else {
      const arrayBuffer = await response.arrayBuffer();
      const id = Math.random().toString(36).substring(7);
      cache.set(id, arrayBuffer);
      return {
        ...response,
        arrayBuffer: {
          id: id,
          bytes: arrayBuffer.byteLength,
        },
      };
    }
  };

  const runtime = {
    options: {},
    logError: console.error,
    platform: {},
    sdkVersion: '1.0.0',
    fetch: fetch,
  };

//   const dynamicImport = new Function('url', `return import(url)`);
//   // get the current base url and append connector.js to it
//   const url = `${window.location.origin}/connector.js`;
//   // fetch the connector js code as a module
//   //@ts-ignore
//   var mod = await dynamicImport(url);
//   // get the default export from the module
//   var connector = new mod.default(runtime);

  var script = 
  `export default class DallEConnector {
    constructor(runtime) {
        this.runtime = runtime;
    }
    async detail(id, context) {
        return Promise.resolve({
            id: '',
            name: 'dummy',
            extension: '',
            type: 0,
            width: 0,
            height: 0,
            relativePath: '',
            metaData: {},
        });
    }
    async query(options, context) {
        throw new Error('Method not implemented.');
        return Promise.resolve({
            links: {
                nextPage: '',
            },
            pageSize: 10,
            data: [
                {
                    id: '',
                    name: 'dummy',
                    extension: '',
                    type: 0,
                    width: 0,
                    height: 0,
                    relativePath: '',
                    metaData: {},
                },
            ],
        });
    }
    async download(id, previewType, intent, context) {
        try {
            const t = await this.runtime.fetch('https://picsum.photos/200/300', { method: 'GET' });
            return t.arrayBuffer;
        }
        catch (error) {
            this.runtime.logError(error);
        }
    }
    getConfigurationOptions() {
        return [
            {
                name: 'prompt',
                displayName: 'Prompt',
                type: 'text',
            }, {
                name: 'image_size',
                displayName: 'Image Size (256, 512, 1024) (optional)',
                type: 'text',
            },
            {
                name: 'cacheId',
                displayName: 'Cache ID (optional)',
                type: 'text',
            },
        ];
    }
    getCapabilities() {
        return {
            detail: false,
            query: false,
            filtering: false,
        };
    }
}
`;

    // import script and create instance of defauilt export
    
    return new (await import(/* @vite-ignore */ `data:text/javascript;base64,${btoa(script)}`)).default(runtime);

//   return connector;
}
