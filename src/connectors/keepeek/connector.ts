import { Connector, Media } from '@chili-publish/studio-connectors';

interface MediaLinks {
  large: string;
  medium: string;
  preview: string;
  small: string;
  whr: string;
  xlarge: string;
}
interface KeepeekLink {
  href: string;
}

interface KeepeekMediaItem {
  id: number;
  title: string;
  statusUpdateDate: string;
  permission: string;
  mediaType: string;
  fileSize: number;
  fileSizeString: string;
  updateDate: string;
  duplicationStatus: string;
  thumbnailGenerationStatus: string;
  _links: KeepeekMediaLinks;
}

interface KeepeekMediaLinks {
  self: KeepeekLink;
  'kpk:large'?: KeepeekLink;
  'kpk:medium'?: KeepeekLink;
  preview?: KeepeekLink;
  'kpk:small'?: KeepeekLink;
  'kpk:whr'?: KeepeekLink;
  'kpk:xlarge'?: KeepeekLink;
}

export default class KeepeekConnector implements Media.MediaConnector {
  private runtime: Connector.ConnectorRuntimeContext;

  // Get the DataCache singleton
  private DataCache = DataCache.getInstance();

  // Get the KeepeekHelper singleton
  private KeepeekHelper = new KeepeekHelper();

  private allowedMimeType: string[] = [
    'application/pdf', // PDF
    'image/jpeg', // JPEG
    'image/png', // PNG
    'image/gif', // GIF
    'image/svg+xml', // SVG
    'image/tiff', // TIFF
  ];

  constructor(runtime: Connector.ConnectorRuntimeContext) {
    this.runtime = runtime;
  }

  async query(
    options: Connector.QueryOptions,
    context: Connector.Dictionary
  ): Promise<Media.MediaPage> {
    // query is called before download
    if (!options.collection && options.filter.length === 1) {
      const id = options.filter[0];
      const url = `${this.runtime.options['KEEPEEK_URL']}/api/dam/medias/${id}`;

      const response = await this.makeKeepeekRequest(url);

      return {
        pageSize: options.pageSize, // Note: pageSize is not currently used by the UI
        data: [
          {
            id: options.filter[0],
            name: response.title,
            relativePath: '',
            extension: response.mediaType.split('/')[1],
            type: 0,
            metaData: this.KeepeekHelper.buildMediaMetadata(
              response._embedded.metadata
            ),
          },
        ],
        links: {
          nextPage: '', // Pagination is ignored in this example
        },
      };
    }

    // If pageSize is bigger than 1, we do a normal query
    let folderName: string =
      options.collection === undefined ? '' : options.collection;

    // VARIABLE IMAGE : Check if context is not empty
    if (Object.keys(context).length > 0) {
      if (context['folder']) {
        folderName = String(context['folder']);
        if (
          options.collection != '' &&
          options.collection != '/' &&
          options.collection != undefined
        ) {
          folderName = folderName + options.collection;
        }
      }
    }

    try {
      return await this.getData(folderName, options);
    } catch (error) {
      // Handle error case here
      throw new Error('Error formatting data => ' + error);
    }
  }

  detail(
    id: string,
    context: Connector.Dictionary
  ): Promise<Media.MediaDetail> {
    return Promise.resolve({
      name: id,
      id: id,
      metaData: {},
      relativePath: '/',
      type: 0,
      width: 200,
      height: 200,
    });
  }

  async download(
    id: string,
    previewType: Media.DownloadType,
    intent: Media.DownloadIntent,
    context: Connector.Dictionary
  ): Promise<Connector.ArrayBufferPointer> {
    let mediaLinks: MediaLinks = this.KeepeekHelper.getMediaLinks(id);
    if (previewType === 'thumbnail') {
      const picture = await this.runtime.fetch(mediaLinks.small, {
        method: 'GET',
      });
      return picture.arrayBuffer;
    }

    if (previewType === 'mediumres') {
      const picture = await this.runtime.fetch(mediaLinks.medium, {
        method: 'GET',
      });
      return picture.arrayBuffer;
    }

    const originalTypes = ['highres', 'fullres', 'original'];
    if (originalTypes.includes(previewType)) {
      const route: string = `${this.runtime.options['KEEPEEK_URL']}/api/dam/medias/${id}/permalinks/original`;
      const response = await this.makeKeepeekRequest(route);
      const href: string = response._links['latest-version'].href;

      const picture = await this.runtime.fetch(href, { method: 'GET' });
      return picture.arrayBuffer;
    }

    // Default case
    const picture = await this.runtime.fetch(mediaLinks.medium, {
      method: 'GET',
    });
    return picture.arrayBuffer;
  }

  getConfigurationOptions(): Connector.ConnectorConfigValue[] | null {
    return [
      {
        name: 'folder',
        displayName: 'Folder',
        type: 'text',
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

  /**
   * Make a request to Keepeek API
   *
   * @param route Keepeek link href
   * @returns Request response
   */
  async makeKeepeekRequest(route: string): Promise<any> {
    try {
      const resp = await this.runtime.fetch(route, {
        method: 'GET',
      });

      if (!resp.ok) {
        throw new ConnectorHttpError(
          resp.status,
          `Failed to fetch from Keepeek. Status: ${resp.status} ${resp.statusText}`
        );
      }

      let responseText = resp.text;
      let response = JSON.parse(responseText);

      return response;
    } catch (error) {
      // Handle error case here
      throw new Error('Error while making Keepeek request => ' + error);
    }
  }

  /**
   *
   * Get folders from Keepeek API and format the data
   *
   * @param route Keepeek link href
   * @param options
   * @returns dataFormatted required by Chili
   */
  async getDataFoldersFormatted(
    route: string,
    options: Connector.QueryOptions
  ): Promise<Media.Media[]> {
    try {
      let response = await this.makeKeepeekRequest(route);

      if (
        response.hasOwnProperty('childrenCount') &&
        response.childrenCount === 0
      )
        return [];

      let data = response._embedded.child;
      // Check if the response is an array
      if (
        response.hasOwnProperty('childrenCount') &&
        response.childrenCount == 1
      ) {
        data = [response._embedded.child];
      }

      const type = 1; // 0: image, 1: folder

      // Transform the data to match the Media type
      const dataFormatted: Media.Media[] = data.map((d: KeepeekMediaItem) => ({
        id: String(d.id),
        name: d.title,
        relativePath:
          options.collection != undefined ? options.collection + '/' : '', // Add a slash to the end of the path to get a good folder path "foldername/subfoldername/..."
        type: type,
        metaData: {},
      }));

      return dataFormatted;
    } catch (error) {
      // Handle error case here
      throw new Error('Error while formatting folders => ' + error);
    }
  }

  /**
   *
   * Get media from Keepeek API and format the data
   *
   * @param route Keepeek link href of folder path + /medias
   * @param options
   * @returns dataFormatted required by Chili
   */
  async getDataMediaFormatted(
    route: string,
    options: Connector.QueryOptions
  ): Promise<Media.Media[]> {
    try {
      if (route == '') {
        return [];
      }

      let response = await this.makeKeepeekRequest(route);

      // Check if there is media OR embedded media is empty
      if (response.treeMediaCount === 0 || response._embedded === undefined)
        return [];

      let data = response._embedded.media;
      // Check if the response is an array
      if (response.totalCount == 1) {
        data = [response._embedded.media];
      }

      // Filter data by allowed mime types
      data = data.filter((item: KeepeekMediaItem) =>
        this.allowedMimeType.includes(item.mediaType)
      );

      this.DataCache.setMediaTree(data);

      const type = 0; // 0: image, 1: folder

      // Transform the data to match the Media type
      const dataFormatted: Media.Media[] = data.map((d: KeepeekMediaItem) => ({
        id: String(d.id),
        name: d.title,
        relativePath:
          options.collection != undefined ? options.collection : '/',
        type: type,
        extension: d.mediaType,
        metaData: {},
      }));

      return dataFormatted;
    } catch (error) {
      // Handle error case here
      throw new Error('Error while formatting media => ' + error);
    }
  }

  /**
   *
   * VARIABLE IMAGE : get data from value set in variable image
   *
   * @param folderPath context['folder'] value when working with variable image
   * @param options
   * @returns
   */
  async getData(
    folderPath: string,
    options: Connector.QueryOptions
  ): Promise<Media.MediaPage> {
    let route: string = `${this.runtime.options['KEEPEEK_URL']}/api/dam/folder-tree`;

    try {
      let folders = folderPath.split(/[\\/]+/); // Split folder path by slash or backslash

      let response = await this.makeKeepeekRequest(route);

      let data = response._embedded.child;
      // Check if the response is an array
      if (
        response.hasOwnProperty('childrenCount') &&
        response.childrenCount == 1
      ) {
        data = [response._embedded.child];
      }

      for (let i = 0; i < folders.length; i++) {
        if (folders[i] != '') {
          let found = data.find(
            (item: KeepeekMediaItem) => item.title == folders[i]
          );
          if (!found) throw new Error('Folder not found');

          if (found) {
            route = found._links.self.href;

            // Check if it's not the last index
            if (i != folders.length - 1) {
              let response = await this.makeKeepeekRequest(route);

              data = response._embedded.child;
              // Check if the response is an array
              if (
                response.hasOwnProperty('childrenCount') &&
                response.childrenCount == 1
              ) {
                data = [response._embedded.child];
              }
            }
          }
        }
      }

      // Get folders from Keepeek API
      let dataFoldersFormatted = await this.getDataFoldersFormatted(
        route,
        options
      );
      // Get media from Keepeek API
      let dataMediaFormatted = await this.getDataMediaFormatted(
        this.KeepeekHelper.getMediaRoute(route),
        options
      );
      // Concatenate folders and media
      const dataFormatted = dataFoldersFormatted.concat(dataMediaFormatted);

      return {
        pageSize: 10, // Note: pageSize is not currently used by the UI
        data: dataFormatted,
        links: {
          nextPage: '', // Pagination is ignored in this example
        },
      };
    } catch (error) {
      // Handle error case here
      this.runtime.logError('Error GET_DATA formatting data => ' + error);
      return {
        pageSize: 10, // Note: pageSize is not currently used by the UI
        data: [],
        links: {
          nextPage: '', // Pagination is ignored in this example
        },
      };
    }
  }
}

class KeepeekHelper {
  // Get the DataCache singleton
  private DataCache: DataCache = DataCache.getInstance();

  /**
   *
   * @param metadata
   * @returns
   */
  buildMediaMetadata(metadata: any): Connector.Dictionary {
    try {
      // Convert metadata to an array, process each item, and return the result as an object
      const metadataArray = Array.isArray(metadata) ? metadata : [metadata];

      return metadataArray.reduce(
        (meta: Connector.Dictionary, element: any) => {
          if (
            element &&
            element.id !== undefined &&
            element.value !== undefined
          ) {
            meta[element.id] = String(element.value);
          }
          return meta;
        },
        {} as Connector.Dictionary
      );
    } catch (error) {
      throw new Error(`Error in buildMediaMetadata: ${error}`);
    }
  }

  /**
   *
   * @param id media id
   * @returns Object with media links
   * ['large', 'medium', 'preview', 'small', 'whr', 'xlarge']
   */
  getMediaLinks(id: string): MediaLinks | null {
    try {
      let medias = this.DataCache.getMediaTree();
      let links: MediaLinks | null = null;

      if (medias) {
        medias.forEach((element: KeepeekMediaItem) => {
          if (String(element.id) == id) {
            links = {
              large: element._links['kpk:large'].href,
              medium: element._links['kpk:medium'].href,
              preview: element._links['preview'].href,
              small: element._links['kpk:small'].href,
              whr: element._links['kpk:whr'].href,
              xlarge: element._links['kpk:xlarge'].href,
            };
          }
        });
      }

      return links;
    } catch (error) {
      throw new Error('Error getMediaLinks => ' + error);
    }
  }

  /**
   * Return the last folder name from the folder path
   *
   * @param folderName options.collection value
   * @returns
   */
  getFolderName(folderName: string): string {
    let lastFolderName: string = '';

    if (folderName !== '/') {
      // Split folder path by slash
      let folderPathSplitted = folderName.split('/');
      // Get last part of folder path splitted
      lastFolderName = folderPathSplitted[folderPathSplitted.length - 1];
    }

    return lastFolderName;
  }

  /**
   * Get the media route
   *
   * @param route Keepeek link href
   * @returns route + /medias
   */
  getMediaRoute(route: string): string {
    // Vérifier que la route ne se termine pas par "folder-tree"
    let splittedRoute = route.split('/');
    if (splittedRoute[splittedRoute.length - 1] != 'folder-tree') {
      return route + '/medias';
    }
    return '';
  }
}

/**
 * Singleton class to store data
 */

class DataCache {
  private static instance: DataCache;
  private mediaTree: KeepeekMediaItem[] | null = null;

  private constructor() {}

  static getInstance(): DataCache {
    if (!DataCache.instance) {
      DataCache.instance = new DataCache();
    }
    return DataCache.instance;
  }

  setMediaTree(data: KeepeekMediaItem[]): void {
    this.mediaTree = data;
  }

  getMediaTree(): KeepeekMediaItem[] | null {
    return this.mediaTree;
  }
}
