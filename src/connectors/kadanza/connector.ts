import { Connector, Media } from '@chili-publish/studio-connectors';
import { categoryToFolderMedia, toPathSegments, toRelativePath } from './lib/collection';
import { getMediaDetailFromDamMedia } from './lib/converter';
import { resolveDownloadPath } from './lib/download';
import { buildSearchQuery, isSearching } from './lib/search';
import type {
  AssetId,
  CollectionResolution,
  DamCategory,
  DamCategoryPage,
  DAMCustomMetadataPage,
  DamMedia,
  DamMediaPage,
} from './lib/types';

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

    return getMediaDetailFromDamMedia(damMedia, metadata);
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
    queryEndpoint += buildSearchQuery(options, context, (err) => this._logError(err));

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
        getMediaDetailFromDamMedia(a, metadata)
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
      const relativePath = toRelativePath([]);

      return {
        pageSize,
        data: resolution.categories.map((category) =>
          categoryToFolderMedia(category, relativePath)
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
    const searching = isSearching(options);

    this._logError(
      `currentPage: ${currentPage} pageSize: ${pageSize} categoryId: ${categoryId} searching: ${searching}`
    );

    let folders: Array<Media.Media> = [];

    if (!searching && currentPage === 1) {
      const childCategories = await this._getChildCategories(categoryId);
      const relativePath = toRelativePath(segments);
      folders = childCategories.map((category) =>
        categoryToFolderMedia(category, relativePath)
      );
    }

    let queryEndpoint = `${this._getBaseMediaUrl()}/api/assets?page=${currentPage}&pageSize=${pageSize}&category=${categoryId}&includeChildren=false`;
    queryEndpoint += buildSearchQuery(options, context, (err) => this._logError(err));

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
      getMediaDetailFromDamMedia(a, metadata)
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
    const downloadPath = resolveDownloadPath(detail, previewType, intent);
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

  _logError(err: string) {
    if (this._getDebug()) {
      this.runtime.logError(err);
    }
  }

  private async _resolveCollection(
    options: Connector.QueryOptions,
    context: Connector.Dictionary
  ): Promise<CollectionResolution> {
    const segments = toPathSegments(options?.collection);

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
