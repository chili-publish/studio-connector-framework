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

    const currentPage = Number(options.pageToken) || 1;
    const pageSize = Number(options.pageSize) || 15;
    this._logError(
      `currentPage: ${currentPage} pageSize: ${pageSize}`
    );
    let queryEndpoint = `${this._getBaseMediaUrl()}/api/assets?page=${currentPage}&pageSize=${pageSize}`;

    // Check if a specific categoryGroup is provided in the settings (context)
    if (context?.categoryGroup) {
      queryEndpoint += `&categoryGroup=${context.categoryGroup}`;
    }

    // Check if a specific category is provided in the settings (context)
    if (context?.category) {
      queryEndpoint += `&category=${context.category}`;
    }

    const filter = options?.filter
      ? options?.filter
      : undefined;

    let searchQuery = '&search=format:(eps OR jpeg OR jpg OR pdf OR png OR psd OR tif OR tiff OR ai)';
    if (filter && filter.length > 0) {
      const stringifiedFilter = filter.toString().trim();

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

        searchQuery += `AND _id: ${id}`;
      } else if (stringifiedFilter && context?.searchQuery) {
        this._logError(
          `Filtering query by ${stringifiedFilter} in ${context.searchQuery}`
        );

        const searchInput = context.searchQuery.toString().replace('<search_input>', stringifiedFilter);
        searchQuery += `AND ${searchInput}`;
      }
    }
    queryEndpoint += searchQuery;

    this._logError(`Query: endpoint ${encodeURI(queryEndpoint)}`);

    const result = await this.runtime.fetch(encodeURI(queryEndpoint), {
      method: 'GET',
      headers: this._getHeaders(),
    });

    if (result.status / 200 != 1) {
      this._logError(`Query fetch failed.`);
      throw new Error(`Query failed ${result.status} ${result.statusText}`);
    }

    const assetsPage: DamMediaPage = JSON.parse(result.text);
    const page = assetsPage['hydra:currentPage'];

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

  async download(
    id: string,
    previewType: Media.DownloadType,
    intent: Media.DownloadIntent,
    context: Connector.Dictionary
  ): Promise<Connector.ArrayBufferPointer> {
    this._logError(`Download: id ${id}, previewType ${previewType}`);

    // Temporary commented until issue with >= 1 await statements is resolved
    // const detail = await this._getDamMediaById(id);

    // Extract all details from stringified id
    const detail: AssetId = JSON.parse(id);

    const baseUrl = this._getBaseMediaUrl();
    let downloadEndpoint = `${baseUrl}`;
    const thumbnail = detail.thumbnail;
    const original = `/${detail.tenantHash}/${detail.assetHash}/${encodeURIComponent(detail.name)}/original`;
    const format = detail.extension.toLowerCase();

    switch (previewType) {
      case 'fullres':
      case 'original':
        downloadEndpoint += original;
        break;

      case 'highres':
        if (['png', 'jpeg'].includes(format)) {
            downloadEndpoint += original;
          } else {
            downloadEndpoint += thumbnail;
          }
        break;

      case 'thumbnail':
      case 'mediumres':
      default:
        if (!thumbnail) {
          throw new Error(`Thumbnail not available for asset with id ${detail.id}`);
        }

        downloadEndpoint += thumbnail;
        break;
    }

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
      name: damMedia.name,
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
