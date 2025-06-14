import { Connector, Media } from '@chili-publish/studio-connectors';

export type AemMetadata = Record<string, any>;
export interface AemEntryContent {
  'dam:processingRenditions': string[];
  'jcr:title': string;
  metadata: AemMetadata;
}

export interface AemEntry {
  'jcr:path': string;
  'jcr:content': AemEntryContent;
  'jcr:primaryType': 'sling:Folder' | 'dam:Asset' | 'sling:OrderedFolder';
}

export interface AemQueryResponse {
  hits: AemEntry[];
  more: boolean;
  results: number;
  offset: number;
}

export enum AemRendition {
  Thumbnail = 'thumbnail',
  MediumRes = 'mediumres',
  HighRes = 'highres',
  FullResFallback = 'fullresfallback',
  Pdf = 'pdf',
}

export type AemRenditions = {
  [key in AemRendition]: string | null;
};

class AEMTransformer {
  static neededProperties = [
    'jcr:path',
    'jcr:primaryType',
    'jcr:content/metadata/dc:title',
    'jcr:content/dam:processingRenditions',
    'jcr:content/jcr:title',
    'jcr:content/metadata/dc:format',
  ];

  // Get the rendition title from string because its created as `DAMNAME.TYPE.WIDTH.HEIGHT.png`
  static getAvailableRenditions = (
    item: AemEntry,
    neededRenditions: string[]
  ) => {
    if (!item['jcr:content'] || !item['jcr:content']['renditions']) {
      return [];
    }
    return neededRenditions.filter((r) => {
      return Object.keys(item['jcr:content']['renditions']).includes(r);
    });
  };

  // Return simple path string as ID
  static getIdFromItem = (
    item: AemEntry,
    _neededRenditions: string[],
    path: string = item['jcr:path']
  ) => {
    return path;
  };
  // When fetching a collection we only have path strings so create from path media object
  static resourcePathToMedia(path: string): Media.Media {
    const name = path.split('/').pop();
    const extension = name.split('.').pop();

    return {
      id: path,
      name: name,
      type: 0,
      // TODO: to be defined
      relativePath: '/',
      extension: extension,
      metaData: {},
    };
  }

  // When fetching a list of media metadata is not needed
  static assetToMedia(
    item: AemEntry,
    neededRenditions: string[],
    rootPath: string,
    path: string = item['jcr:path']
  ): Media.Media {
    if (
      ['sling:Folder', 'sling:OrderedFolder'].includes(item['jcr:primaryType'])
    ) {
      const pathSplit = item['jcr:path'].split('/');
      const folderName = pathSplit.pop();
      const relativePath = item['jcr:path'].replace(rootPath, '');
      return {
        id: path,
        name: folderName,
        type: 1,
        relativePath: relativePath,
        extension: 'folder',
        metaData: {},
      };
    }
    let name = item['jcr:content']['metadata']['dc:title'];
    if (Array.isArray(name)) {
      name = name.length ? name[0] : null;
    }
    if (!name) {
      name = path.split('/').pop();
    }
    let extension = path.split('/').pop().split('.').pop();
    return {
      id: this.getIdFromItem(item, neededRenditions, path),
      name: name,
      type: 0,
      // TODO: to be defined
      relativePath: '/',
      extension: extension,
      metaData: {},
    };
  }
  // Add metadata, width & height to response
  static assetToMediaDetail(
    data: AemEntry,
    neededRenditions: string[],
    path: string,
    rootPath: string
  ): Media.MediaDetail {
    const metadata = data['jcr:content']['metadata'];
    return {
      ...this.assetToMedia(data, neededRenditions, rootPath, path),
      height: metadata['tiff:ImageLength'],
      width: metadata['tiff:ImageWidth'],
      metaData: this.getMetaDataObject(metadata),
    } as Media.MediaDetail;
  }

  static getMetaDataObject(metadata: AemMetadata) {
    return Object.keys(metadata).reduce<Record<string, string>>(
      (result, key) => {
        if (
          typeof metadata[key] === 'string' ||
          typeof metadata[key] === 'number' ||
          typeof metadata[key] === 'boolean'
        ) {
          result[key] = `${metadata[key]}`;
        } else if (
          Array.isArray(metadata[key]) &&
          metadata[key].length &&
          typeof metadata[key][0] === 'string'
        ) {
          result[key] = metadata[key]
            .map((m) => {
              return m.split('/').pop();
            })
            .join(', ');
        }
        return result;
      },
      {}
    );
  }
}

export default class MyConnector implements Media.MediaConnector {
  private runtime: Connector.ConnectorRuntimeContext;

  constructor(runtime: Connector.ConnectorRuntimeContext) {
    this.runtime = runtime;
    this.log(
      `[Runtime options]:\n ${JSON.stringify(this.runtime.options, null, 2)}`
    );
  }

  private get baseUrl() {
    const root = this.runtime.options['BASE_URL'] as string;
    if (!root) {
      throw new Error('"BASE_URL" is not defined in the runtime options');
    }
    return root.endsWith('/') ? root : `${root}/`;
  }

  private get aemRenditions() {
    const renditionOverrides = this.runtime.options[
      'renditionOverrides'
    ] as string;
    let overrides = {};
    if (renditionOverrides.length) {
      try {
        overrides = JSON.parse(renditionOverrides);

        const supportedRenditions = Object.values(AemRendition) as string[];
        const renditionKeysThatAreNotCorrect = Object.keys(overrides).filter(
          (key) => {
            return !supportedRenditions.includes(key);
          }
        );
        if (!renditionKeysThatAreNotCorrect) {
          throw new Error(
            `The renditionOverrides in the runtime options contains not supported renditions ${renditionKeysThatAreNotCorrect.join(
              ', '
            )}. The supported renditions are ${Object.values(AemRendition)}`
          );
        }
      } catch {
        throw new Error(
          'The renditionOverrides in the runtime options are not the correct format the expected format is JSON'
        );
      }
    }
    const renditions = {
      [AemRendition.Thumbnail]: 'cq5dam.thumbnail.140.100.png',
      [AemRendition.MediumRes]: 'cq5dam.thumbnail.319.319.png',
      [AemRendition.HighRes]: 'cq5dam.web.1280.1280.jpeg',
      [AemRendition.FullResFallback]: 'cq5dam.zoom.2048.2048.jpeg',
      [AemRendition.Pdf]: 'cq5dam.preview.pdf',
      ...overrides,
    } as AemRenditions;

    this.log(`Configured renditions \n ${JSON.stringify(renditions, null, 2)}`);

    return renditions;
  }

  private get neededProperties() {
    return [
      ...AEMTransformer.neededProperties,
      ...Object.values(this.aemRenditions).map(
        (rend) => `jcr:content/renditions/${rend}/jcr:created`
      ),
    ];
  }

  private get rootPath() {
    const rootPath = this.runtime.options['rootPath'] as string | undefined;
    if (rootPath) {
      return rootPath.endsWith('/') ? rootPath.slice(0, -1) : rootPath;
    }
    return '/content/dam';
  }

  async query(
    options: Connector.QueryOptions,
    context: Connector.Dictionary
  ): Promise<Media.MediaPage> {
    this.log(
      `[Query params]:\n${JSON.stringify({ options, context }, null, 2)}`
    );
    const offset = Number(options.pageToken) || 0;
    const pageSize = options.pageSize || 20;
    // When collection we fetch the collection resources and create media objects from paths
    const collection = context.collection as string | undefined;
    // This is never called because when is there a situation where collection is ""
    // Collection is either undefined or a path with "/"
    if (collection && collection.length) {
      return this.aemResourceCall(`${collection}.1.json`).then((data) => {
        if (data['sling:members'] && data['sling:members']['sling:resources']) {
          const resources =
            data['sling:members'] && data['sling:members']['sling:resources'];
          const splittedResources = resources.slice(offset, offset + pageSize);
          const formattedData = splittedResources.map((item) => {
            const data = AEMTransformer.resourcePathToMedia(item);
            return data;
          });
          return {
            pageSize: splittedResources.length,
            data: formattedData,
            links: {
              nextPage:
                splittedResources.length === pageSize
                  ? `${offset + pageSize}`
                  : '',
            },
          };
        }
      });
    }

    const filter = options.filter[0];
    // Query before download
    if (!options.collection) {
      let contextPath = '';
      if (context.path && typeof context.path == 'string') {
        contextPath = context.path;
        if (!contextPath.startsWith('/')) {
          contextPath = '/' + contextPath;
        }
        if (!contextPath.endsWith('/')) {
          contextPath = contextPath + '/';
        }
      }
      // Create the full path string, but check if it's still an old ID format
      // AEM does not support folders with " as a character in the name, so impossible for the path {" to exist
      const fullPath = filter.startsWith('{"')
        ? JSON.parse(filter).path
        : contextPath + filter;
      this.log(`Query before download case for: ${fullPath}`);
      return {
        pageSize: 1,
        data: [AEMTransformer.resourcePathToMedia(fullPath)],
        links: {
          nextPage: '',
        },
      };
    }

    const fulltext = filter;
    // Don't show the folders when its set via configuration
    let showFolders = context.includeSubfolders ?? true;

    // Only flat when not searching
    let isFlat = !fulltext.length && showFolders;

    const contextPath = context.path as string;
    if (contextPath && contextPath.length < this.rootPath.length) {
      throw new Error(
        `The provided "path" (${contextPath}) is invalid. It cannot exceed the directory level of the specified root path (${this.rootPath}).`
      );
    }
    let path = (context.path as string) || this.rootPath;

    // when there is a collection other than root, we know that user clicks on folder item
    if (options.collection?.length && options.collection !== '/') {
      path = `${this.rootPath}${options.collection}`;
    }
    // Otherwise we do a query call

    return this.aemQueryCall(
      context['matchExactly'] === true,
      {
        fulltext: fulltext,
        path: path,
        mainAsset: true,
        location: 'asset',
        'location.suggestion': 'Assets',
        'path.flat': isFlat,
        excludepaths: '(.*)%3F(jcr%3Acontent%7Crep%3Apolicy)(%2F.*)%3F',
      },
      [
        // Check on Folders or files
        {
          'p.or': true,

          ...(showFolders
            ? {
                '1_group.1_group.type': 'sling:Folder',
                '1_group.2_group.property': 'jcr:path',
                '1_group.2_group.property.value': `${this.rootPath}/appdata`,
                '1_group.2_group.property.operation': 'unequals',
              }
            : {}),
          '2_group.1_group.type': 'dam:Asset',
          // When files Check if its of type image or he has the full res fallback to use
          '2_group.2_group.p.or': true,
          '2_group.2_group.1_group.p.or': true,
          '2_group.2_group.1_group.property': 'jcr:content/metadata/dc:format',
          '2_group.2_group.1_group.property.1_value': 'image/jpeg',
          '2_group.2_group.1_group.property.2_value': 'image/png',
          '2_group.2_group.2_group.property': `jcr:content/renditions/${this.aemRenditions.fullresfallback}/jcr:created`,
          '2_group.2_group.2_group.property.operation': 'exists',
        },
      ],
      {
        pageSize: pageSize,
        offset: offset,
        extraQuery: context.query as string,
        neededProperties: this.neededProperties,
        sortName: options.sortBy,
        sortDir: options.sortOrder,
      }
    ).then((data) => {
      const formattedData = data.hits.map((item) => {
        const data = AEMTransformer.assetToMedia(
          item,
          Object.values(this.aemRenditions),
          this.rootPath
        );
        return data;
      });
      const queryResult = {
        pageSize: pageSize,
        data: formattedData,
        links: {
          nextPage: data.more ? `${offset + options.pageSize}` : '',
        },
      };
      this.log(`[Query results]:\n ${JSON.stringify(queryResult, null, 2)}`);
      return queryResult;
    });
  }
  async detail(
    id: string,
    context: Connector.Dictionary
  ): Promise<Media.MediaDetail> {
    this.log(`[Detail params]:\n ${id}`);
    const path = id; // ID is now directly the path string
    const detailResult = await this.aemResourceCall<AemEntry>(
      `${path}.-1.json`
    ).then((data) => {
      const detail = AEMTransformer.assetToMediaDetail(
        data,
        Object.values(this.aemRenditions),
        path,
        this.rootPath
      );
      return detail;
    });
    this.log(`[Detail result]:\n ${JSON.stringify(detailResult, null, 2)}`);
    return detailResult;
  }

  async download(
    id: string,
    previewType: Media.DownloadType,
    intent: Media.DownloadIntent,
    context: Connector.Dictionary
  ): Promise<Connector.ArrayBufferPointer> {
    this.log(
      `[Download params]:\n${JSON.stringify(
        {
          id,
          previewType,
          intent,
        },
        null,
        2
      )}`
    );

    const path = id;

    // Fetch asset metadata using the pattern {baseUrl}{id}-1.json
    const metadataResult = await this.aemResourceCall<AemEntry>(
      `${path}.-1.json`
    );

    // Extract available renditions and format from the metadata
    const availableRenditions = AEMTransformer.getAvailableRenditions(
      metadataResult,
      Object.values(this.aemRenditions)
    );
    const format = metadataResult['jcr:content']['metadata']['dc:format'];

    let downloadPath = path;
    if (downloadPath.startsWith('/')) {
      downloadPath = path.substring(1);
    }
    let rendition = this.getCorrectRendition(
      availableRenditions,
      previewType,
      intent,
      format
    );

    if (rendition) {
      downloadPath += `/_jcr_content/renditions/${rendition}`;
    }

    this.log(`Download path ${downloadPath}`);
    const requestUrl = `${this.baseUrl}${downloadPath}`;
    this.log(`Request url ${requestUrl}`);
    return this.runtime
      .fetch(requestUrl, {
        method: 'GET',
        headers: {
          'X-GraFx-Proxy-User-Agent': 'AEM Connector/1.0.0',
        },
      })
      .then((result) => {
        if (!result.ok) {
          throw new ConnectorHttpError(
            result.status,
            `AEM: Download failed ${result.status} - ${result.statusText}`
          );
        }
        return result.arrayBuffer;
      });
  }

  getConfigurationOptions(): Connector.ConnectorConfigValue[] | null {
    return [
      {
        name: 'path',
        displayName: 'Search path (folder) ',
        type: 'text',
      },
      {
        name: 'query',
        displayName: 'Search Query',
        type: 'text',
      },
      {
        name: 'matchExactly',
        displayName:
          'Match Exactly - when searching, the search name must be an exact match',
        type: 'boolean',
      },
      {
        name: 'includeSubfolders',
        displayName: 'Include subfolders',
        type: 'boolean',
      },
    ];
  }
  getCapabilities(): Media.MediaConnectorCapabilities {
    return {
      query: true,
      detail: true,
      filtering: true,
      metadata: true,
    };
  }

  private getCorrectRendition(
    availableRenditions: string[],
    previewType: Media.DownloadType,
    intent: Media.DownloadIntent,
    format?: string
  ): string | null {
    const getRendition = (renditionType: AemRendition): string | null => {
      const rendition = this.aemRenditions[renditionType];

      if (availableRenditions.includes(rendition)) {
        return rendition;
      }

      switch (renditionType) {
        case AemRendition.Thumbnail:
          return getRendition(AemRendition.MediumRes);
        case AemRendition.MediumRes:
          return getRendition(AemRendition.HighRes);
        case AemRendition.HighRes:
        case AemRendition.Pdf:
          return getRendition(AemRendition.FullResFallback);
        default:
          // Original asset
          return null;
      }
    };

    switch (previewType) {
      case 'thumbnail':
        return getRendition(AemRendition.Thumbnail);
      case 'mediumres':
        return getRendition(AemRendition.MediumRes);
      case 'highres':
        return getRendition(AemRendition.HighRes);
      case 'fullres':
        // For 'print' intent we try to get assets other than natively supported in PDF format
        if (
          intent === 'print' &&
          !this.isImage(format) &&
          !this.isPdf(format)
        ) {
          return getRendition(AemRendition.Pdf);
          // For other intent types we always expect images only
        } else if (intent !== 'print' && !this.isImage(format)) {
          return getRendition(AemRendition.FullResFallback);
        }
        break;
    }

    // Original asset
    return null;
  }

  private async aemQueryCall(
    matchExactly: boolean,
    queryParams: Record<string, string | boolean | number | any[]>,
    groups: Record<string, string | number | boolean | any[]>[],
    {
      pageSize,
      offset,
      neededProperties,
      extraQuery,
      sortName,
      sortDir,
    }: {
      pageSize: number;
      offset: number;
      neededProperties?: string[];
      extraQuery?: string;
      sortName?: string;
      sortDir?: string;
    }
  ): Promise<AemQueryResponse> {
    const allQuery = {
      ...queryParams,
      'p.guessTotal': pageSize,
      'p.offset': offset,
      'p.limit': pageSize,
      sortName,
      sortDir,
    };
    if (matchExactly) {
      allQuery['nodename'] = queryParams.fulltext;
    }
    if (neededProperties) {
      allQuery['p.hits'] = 'selective';
      allQuery['p.properties'] = neededProperties.join(' ');
    } else {
      allQuery['p.hits'] = 'full';
      allQuery['p.nodedepth'] = 2;
    }
    groups.forEach((group, index) => {
      Object.keys(group).forEach((key) => {
        allQuery[`${index + 1}_group.${key}`] = group[key];
      });
    });
    let query = Object.keys(allQuery).reduce<string>((result, key) => {
      let value = allQuery[key];
      if (!value) {
        return result;
      }
      result += `${result.length ? '&' : ''}${key}=${value}`;
      return result;
    }, '');
    if (extraQuery) {
      query += `&${extraQuery}`;
    }
    const queryingRoute = `bin/querybuilder.json?${query}`;

    const requestUrl = `${this.baseUrl}${queryingRoute}`;
    this.log(`Request url: ${requestUrl}`);
    const res = await this.runtime.fetch(requestUrl, {
      method: 'GET',
      headers: {
        'X-GraFx-Proxy-User-Agent': 'AEM Connector/1.0.0',
      },
    });

    if (!res.ok) {
      throw new ConnectorHttpError(
        res.status,
        `AEM: Query failed ${res.status} - ${res.statusText}`
      );
    }
    return JSON.parse(res.text) as any;
  }

  private async aemResourceCall<Return = any>(path: string) {
    let detailPath = path;
    if (path.startsWith('/')) {
      detailPath = path.substring(1);
    }
    const requestUrl = `${this.baseUrl}${detailPath}`;
    this.log(requestUrl);
    const res = await this.runtime.fetch(requestUrl, {
      method: 'GET',
      headers: {
        'X-GraFx-Proxy-User-Agent': 'AEM Connector/1.0.0',
      },
    });

    if (!res.ok) {
      throw new ConnectorHttpError(
        res.status,
        `AEM: Query failed ${res.status} - ${res.statusText}`
      );
    }
    return JSON.parse(res.text) as Return;
  }

  private log(message: string) {
    if (this.runtime.options['logEnabled']) {
      this.runtime.logError(message);
    }
  }

  private isImage(format?: string) {
    return format && ['image/png', 'image/jpeg'].includes(format);
  }

  private isPdf(format?: string) {
    return format && format === 'application/pdf';
  }
}
