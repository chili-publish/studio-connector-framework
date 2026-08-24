import { Connector, Media } from '@chili-publish/studio-connectors';

interface DamMedia {
  id: number;
  name: string;
  thumbnail: string;
  format: string;
  width: number;
  height: number;
  size: number;
  assetHash: string;
  tenantHash: string;
  fileName: string;
  title: string;
  createdBy: {
    id: number;
    userName: string;
    firstName: string;
    lastName: string;
  }
}

interface DamMediaPage {
  'hydra:totalItems': number;
  'hydra:itemsPerPage': number;
  'hydra:currentPage': number;
  'hydra:totalPages': number;
  'hydra:member': Array<DamMedia>;
}

interface AssetId {
  id: string;
  name: string;
  assetHash: string;
  tenantHash: string;
  thumbnail: string;
  extension: string;
}

interface DAMCustomMetadata {
  id: number;
  name: string;
  label: string;
  type: string;
  defaultValue: string;
  required: boolean;
  default: boolean;
  readOnly: boolean;
  visible: boolean;
  sorting: boolean;
  sort: number;
  dropdownOptions: object;
  title: string;
  text: string;
  deletedAt: string;
  filterable: boolean;
  sortable: boolean;
  attributeName: string;
}

interface DAMCustomMetadataPage {
  'hydra:totalItems': number;
  'hydra:itemsPerPage': number;
  'hydra:currentPage': number;
  'hydra:totalPages': number;
  'hydra:member': Array<DAMCustomMetadata>;
}

interface DamCategory {
  id: number;
  name: string;
  parent: number | null;
  categories_count?: number;
  assets_count?: number;
}

interface DamCategoryPage {
  'hydra:totalItems': number;
  'hydra:itemsPerPage': number;
  'hydra:currentPage': number;
  'hydra:totalPages': number;
  'hydra:member': Array<DamCategory>;
}

type CollectionResolution =
  | { kind: 'notFound' }
  | { kind: 'groupRoot'; categories: Array<DamCategory> }
  | { kind: 'category'; categoryId: string; segments: Array<string> };

export default class DamConnector implements Media.MediaConnector {
  runtime: Connector.ConnectorRuntimeContext;

  constructor(runtime: Connector.ConnectorRuntimeContext) {
    this.runtime = runtime;
  }

  async detail(
    id: string,
    context: Connector.Dictionary
  ): Promise<Media.MediaDetail> {
    const assetId: AssetId = JSON.parse(id);
    const damMedia = await this._getDamMediaById(assetId.id);
    const metadata = await this._getCustomMetadata();

    return this._getMediaDetailFromDamMedia(damMedia, metadata);
  }

  async query(
    options: Connector.QueryOptions,
    context: Connector.Dictionary
  ): Promise<Media.MediaPage> {
    this._logError(
      `query options: sortOrder ${options?.sortOrder} sortBy ${options?.sortBy} collection ${options?.collection} filter ${options?.filter} pageToken ${options?.pageToken} pageSize ${options?.pageSize}`
    );

    this._logError(
      `context: categoryGroup ${context?.categoryGroup} category ${context?.category} searchQuery ${context?.searchQuery}`
    );

    const pageSize = Number(options.pageSize) || 15;

    // Category (folder) browsing only kicks in when an entry point is
    // configured. Without it, fall back to the original flat behavior.
    if (context?.categoryGroup || context?.category) {
      return this._queryCategorized(options, context, pageSize);
    }

    return this._queryLegacy(options, context, pageSize);
  }

  private async _queryLegacy(
    options: Connector.QueryOptions,
    context: Connector.Dictionary,
    pageSize: number
  ): Promise<Media.MediaPage> {
    const currentPage = Number(options.pageToken) || 1;
    this._logError(
      `currentPage: ${currentPage} pageSize: ${pageSize}`
    );
    let queryEndpoint = `${this._getBaseMediaUrl()}/api/assets?page=${currentPage}&pageSize=${pageSize}`;
    queryEndpoint += this._buildSearchQuery(options, context);

    this._logError(`Query: endpoint ${queryEndpoint}`);

    const result = await this.runtime.fetch(queryEndpoint, {
      method: 'GET',
      headers: this._getHeaders(),
    });

    if (result.status / 200 != 1) {
      this._logError(`Query fetch failed.`);
      throw new Error(`Query failed ${result.status} ${result.statusText}`);
    }

    const assetsPage: DamMediaPage = JSON.parse(result.text);
    const metadata = await this._getCustomMetadata();
    const nextPage = Number(assetsPage['hydra:currentPage']) < Number(assetsPage['hydra:totalPages']) ? Number(assetsPage['hydra:currentPage']) + 1 : '';
    this._logError(`nextPage: ${nextPage}`);

    return {
      pageSize: pageSize,
      data: assetsPage['hydra:member'].map((a: DamMedia) =>
        this._getMediaDetailFromDamMedia(a, metadata)
      ),
      links: {
        nextPage: nextPage.toString(),
      },
    };
  }

  private async _queryCategorized(
    options: Connector.QueryOptions,
    context: Connector.Dictionary,
    pageSize: number
  ): Promise<Media.MediaPage> {
    const resolution = await this._resolveCollection(options, context);

    if (resolution.kind === 'notFound') {
      this._logError(`Query: collection "${options?.collection}" could not be resolved to a category.`);
      return {
        pageSize,
        data: [],
        links: { nextPage: '' },
      };
    }

    if (resolution.kind === 'groupRoot') {
      // Multiple root categories configured on the categoryGroup: show them
      // as folders only, with no loose assets pool at this level.
      const relativePath = this._toRelativePath([]);

      return {
        pageSize,
        data: resolution.categories.map((category) =>
          this._categoryToFolderMedia(category, relativePath)
        ),
        links: { nextPage: '' },
      };
    }

    return this._queryAssetsAndFolders(
      options,
      context,
      pageSize,
      resolution.categoryId,
      resolution.segments
    );
  }

  private async _queryAssetsAndFolders(
    options: Connector.QueryOptions,
    context: Connector.Dictionary,
    pageSize: number,
    categoryId: string,
    segments: Array<string>
  ): Promise<Media.MediaPage> {
    const currentPage = Number(options.pageToken) || 1;
    const searching = this._isSearching(options);

    this._logError(
      `currentPage: ${currentPage} pageSize: ${pageSize} categoryId: ${categoryId} searching: ${searching}`
    );

    let folders: Array<Media.Media> = [];

    if (!searching && currentPage === 1) {
      const childCategories = await this._getChildCategories(categoryId);
      const relativePath = this._toRelativePath(segments);
      folders = childCategories.map((category) =>
        this._categoryToFolderMedia(category, relativePath)
      );
    }

    let queryEndpoint = `${this._getBaseMediaUrl()}/api/assets?page=${currentPage}&pageSize=${pageSize}&category=${categoryId}&includeChildren=false`;
    queryEndpoint += this._buildSearchQuery(options, context);

    this._logError(`Query: endpoint ${queryEndpoint}`);

    const result = await this.runtime.fetch(queryEndpoint, {
      method: 'GET',
      headers: this._getHeaders(),
    });

    if (result.status / 200 != 1) {
      this._logError(`Query fetch failed.`);
      throw new Error(`Query failed ${result.status} ${result.statusText}`);
    }

    const assetsPage: DamMediaPage = JSON.parse(result.text);

    const metadata = await this._getCustomMetadata();

    const nextPage = Number(assetsPage['hydra:currentPage']) < Number(assetsPage['hydra:totalPages']) ? Number(assetsPage['hydra:currentPage']) + 1 : '';
    this._logError(`nextPage: ${nextPage}`);

    const assets = assetsPage['hydra:member'].map((a: DamMedia) =>
      this._getMediaDetailFromDamMedia(a, metadata)
    );

    return {
      pageSize,
      data: [...folders, ...assets],
      links: {
        nextPage: nextPage.toString(),
      },
    };
  }

  async download(
    id: string,
    previewType: Media.DownloadType,
    intent: Media.DownloadIntent,
    context: Connector.Dictionary
  ): Promise<Connector.ArrayBufferPointer> {
    this._logError(`Download: id ${id}, previewType ${previewType}, intent ${intent}`);

    // Temporary commented until issue with >= 1 await statements is resolved
    // const detail = await this._getDamMediaById(id);

    // Extract all details from stringified id
    const detail: AssetId = JSON.parse(id);
    const baseUrl = this._getBaseMediaUrl();
    const downloadPath = this._resolveDownloadPath(detail, previewType, intent);
    const downloadEndpoint = `${baseUrl}${downloadPath}`;

    this._logError(`Download: endpoint ${downloadEndpoint}`);

    const result = await this.runtime.fetch(downloadEndpoint, {
      method: 'GET',
      headers: this._getHeaders(),
    });

    this._logError(
      `Download: result status ${result.status} ${result.statusText}.`
    );

    if (result.status / 200 != 1) {
      this._logError(
        `Download: fetch failed for media with id ${id} and previewType ${previewType}`
      );
      throw new Error(`Download failed ${result.status} ${result.statusText}`);
    }

    this._logError(
      `Download: result array buffer id, bytes: ${
        (result.arrayBuffer.id, result.arrayBuffer.bytes)
      }`
    );

    return result.arrayBuffer;
  }

  getConfigurationOptions(): Connector.ConnectorConfigValue[] | null {
    return [
      {
        name: 'categoryGroup',
        displayName: 'Category group (entrypoint) ID',
        type: 'text',
      },
      {
        name: 'category',
        displayName: 'Category ID',
        type: 'text',
      },
      {
        name: 'searchQuery',
        displayName: 'Search query',
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

  _getBaseMediaUrl() {
    return this.runtime.options['BASE_URL'];
  }

  _getDebug() {
    return this.runtime.options['DEBUG'];
  }

  _getHeaders() {
    return {
      'Accept': 'application/json',
    };
  }

  private _resolveDownloadPath(
    detail: AssetId,
    previewType: Media.DownloadType,
    intent: Media.DownloadIntent
  ): string {
    const format = detail.extension.toLowerCase();
    const cdnBasePath = `/cdn/${detail.tenantHash}/${detail.assetHash}/${encodeURIComponent(detail.name)}`;
    const original = `${cdnBasePath}/original`;
    const isTiff = ['tif', 'tiff'].includes(format);
    const isPdf = format === 'pdf';
    const isOutputPreview = previewType === 'fullres' || previewType === 'highres';

    if (isPdf && intent === 'print' && isOutputPreview) {
      return `${cdnBasePath}/pdf-wrap`;
    }

    if (isTiff && isOutputPreview) {
      return this._requireThumbnailPath(detail);
    }

    if (
      previewType === 'original' ||
      previewType === 'fullres' ||
      (previewType === 'highres' && ['png', 'jpeg'].includes(format))
    ) {
      return original;
    }

    return this._requireThumbnailPath(detail);
  }

  private _requireThumbnailPath(detail: AssetId): string {
    if (!detail.thumbnail) {
      throw new Error(`Thumbnail not available for asset with id ${detail.id}`);
    }

    return detail.thumbnail;
  }

  _getMediaDetailFromDamMedia(damMedia: DamMedia, customMetadata: DAMCustomMetadataPage): Media.MediaDetail {
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
      metaData: this._getMetadataFromDamMedia(damMedia, customMetadata),
      extension: damMedia.format,
      width: damMedia.width,
      height: damMedia.height,
    };
  }

  _getMetadataFromDamMedia(damMedia: DamMedia, customMetadata: DAMCustomMetadataPage): Connector.Dictionary {
    const attributeNames: Array<string> = customMetadata['hydra:member'].map((m) => m.attributeName);

    return Object.fromEntries(attributeNames.filter((a) => ['string', 'number'].includes(typeof damMedia[a])).map((a) => [a, damMedia[a].toString()] ));
  }

  _logError(err: string) {
    if (this._getDebug()) {
      this.runtime.logError(err);
    }
  }

  private _getFilterText(options: Connector.QueryOptions): string {
    const filter = options?.filter;
    if (!filter || filter.length === 0) {
      return '';
    }

    return filter.toString().trim();
  }

  private _isSearching(options: Connector.QueryOptions): boolean {
    return this._getFilterText(options).length > 0;
  }

  private _buildSearchQuery(options: Connector.QueryOptions, context: Connector.Dictionary): string {
    const stringifiedFilter = this._getFilterText(options);
    let searchValue = 'format:(eps OR jpeg OR jpg OR pdf OR png OR psd OR tif OR tiff OR ai)';

    if (stringifiedFilter) {
      let id;

      try {
        id = JSON.parse(stringifiedFilter).id;
        this._logError(
          `ID ${id}`
        );
      } catch (e) {
        // filter is not JSON
      }

      if (id) {
        this._logError(
          `Filtering query by _id: ${id}`
        );

        searchValue += `AND _id: ${id}`;
      } else if (context?.searchQuery) {
        this._logError(
          `Filtering query by ${stringifiedFilter} in ${context.searchQuery}`
        );

        const searchInput = context.searchQuery.toString().replace('<search_input>', stringifiedFilter);
        searchValue += `AND ${searchInput}`;
      }
    }

    return `&search=${encodeURIComponent(searchValue)}`;
  }

  private _toPathSegments(collection?: string): Array<string> {
    if (!collection) {
      return [];
    }

    return collection.split('/').filter((segment) => segment.length > 0);
  }

  private _toRelativePath(segments: Array<string>): string {
    return segments.length === 0 ? '/' : `/${segments.join('/')}/`;
  }

  private _categoryToFolderMedia(category: DamCategory, relativePath: string): Media.Media {
    return {
      id: String(category.id),
      name: category.name,
      relativePath,
      type: 1,
      metaData: {},
      extension: '',
    };
  }

  private async _resolveCollection(
    options: Connector.QueryOptions,
    context: Connector.Dictionary
  ): Promise<CollectionResolution> {
    const segments = this._toPathSegments(options?.collection);

    if (context?.categoryGroup) {
      const rootCategories = await this._getCategoryGroupRoots(String(context.categoryGroup));

      if (segments.length === 0) {
        return { kind: 'groupRoot', categories: rootCategories };
      }

      const [firstSegment, ...remainingSegments] = segments;
      const matchedRoot = rootCategories.find((category) => category.name === firstSegment);

      if (!matchedRoot) {
        return { kind: 'notFound' };
      }

      return this._walkFromCategory(matchedRoot, remainingSegments, [firstSegment]);
    }

    const startCategory = await this._getCategoryById(String(context.category));

    return this._walkFromCategory(startCategory, segments, []);
  }

  private async _walkFromCategory(
    startCategory: DamCategory,
    remainingSegments: Array<string>,
    startSegments: Array<string>
  ): Promise<CollectionResolution> {
    let current = startCategory;
    const segments = [...startSegments];

    for (const segment of remainingSegments) {
      const children = await this._getChildCategories(String(current.id));
      const match = children.find((category) => category.name === segment);
      if (!match) {
        return { kind: 'notFound' };
      }

      current = match;
      segments.push(segment);
    }

    return { kind: 'category', categoryId: String(current.id), segments };
  }

  private async _getCategoryGroupRoots(groupId: string): Promise<Array<DamCategory>> {
    const endpoint = `${this._getBaseMediaUrl()}/api/categories?categoryGroup=${groupId}&includeChildren=false&pageSize=9999&excludePermissions=true`;

    const result = await this.runtime.fetch(encodeURI(endpoint), {
      method: 'GET',
      headers: this._getHeaders(),
    });

    if (result.status / 200 != 1) {
      this._logError(`Category group fetch failed for id ${groupId}`);
      throw new Error(`Category group fetch failed ${result.status} ${result.statusText}`);
    }

    const page: DamCategoryPage = JSON.parse(result.text);
    return page['hydra:member'];
  }

  private async _getCategoryById(id: string): Promise<DamCategory> {
    const endpoint = `${this._getBaseMediaUrl()}/api/categories/${id}`;

    const result = await this.runtime.fetch(endpoint, {
      method: 'GET',
      headers: this._getHeaders(),
    });

    if (result.status / 200 != 1) {
      this._logError(`Category fetch failed for id ${id}`);
      throw new Error(`Category fetch failed ${result.status} ${result.statusText}`);
    }

    return JSON.parse(result.text);
  }

  private async _getChildCategories(parentId: string): Promise<Array<DamCategory>> {
    const endpoint = `${this._getBaseMediaUrl()}/api/categories?parentCategory=${parentId}&includeChildren=false&pageSize=9999&excludePermissions=true`;

    const result = await this.runtime.fetch(encodeURI(endpoint), {
      method: 'GET',
      headers: this._getHeaders(),
    });

    if (result.status / 200 != 1) {
      this._logError(`Child categories fetch failed for parent ${parentId}`);
      throw new Error(`Child categories fetch failed ${result.status} ${result.statusText}`);
    }

    const page: DamCategoryPage = JSON.parse(result.text);
    return page['hydra:member'];
  }

  private async _getDamMediaById(id: string) {
    const detailEndpoint = `${this._getBaseMediaUrl()}/api/assets/${id}`;

    const result = await this.runtime.fetch(detailEndpoint, {
      method: 'GET',
      headers: this._getHeaders(),
    });

    if (result.status / 200 != 1) {
      this._logError(`Detail fetch failed for media with id ${id}`);
      throw new Error(`Detail failed ${result.status} ${result.statusText}`);
    }

    const damMedia: DamMedia = JSON.parse(result.text);
    return damMedia;
  }

  private async _getCustomMetadata() {
    const customMetadataEndpoint = `${this._getBaseMediaUrl()}/api/custom-metadata`;

    const result = await this.runtime.fetch(customMetadataEndpoint, {
      method: 'GET',
      headers: this._getHeaders(),
    });

    if (result.status / 200 != 1) {
      this._logError(`Custom metadata fetch failed.`);
      throw new Error(`Custom metadata fetch failed: ${result.status} ${result.statusText}`);
    }

    const customMetadata: DAMCustomMetadataPage = JSON.parse(result.text);
    return customMetadata;
  }
}
