import { Connector, Media } from '@chili-publish/studio-connectors';

// -- Aprimo API response types --

type AprimoRecord = {
  id: string;
  title?: string;
  createdOn?: string;
  modifiedOn?: string;
  tag?: string;
  status?: string;
  _embedded?: {
    masterFileLatestVersion?: AprimoFileVersion;
    fields?: { _embedded?: { field?: AprimoField[] } };
    image?: AprimoImage;
  };
  _links?: Record<string, AprimoLink>;
};

type AprimoFileVersion = {
  id?: string;
  fileName?: string;
  fileExtension?: string;
  width?: number;
  height?: number;
  _links?: Record<string, AprimoLink>;
};

type AprimoImage = {
  width?: number;
  height?: number;
  uri?: string;
  _links?: Record<string, AprimoLink>;
  _embedded?: {
    preview?: { uri?: string; _links?: Record<string, AprimoLink> };
    thumbnail?: { uri?: string; _links?: Record<string, AprimoLink> };
  };
};

type AprimoField = {
  id?: string;
  fieldName?: string;
  dataType?: string;
  localizedValues?: Array<{ value?: string; languageId?: string }>;
};

type AprimoLink = {
  href?: string;
  'select-key'?: string;
};

type AprimoPagedResponse<T> = {
  page?: number;
  pageSize?: number;
  totalCount?: number;
  items?: T[];
  _embedded?: { item?: T[] };
  _links?: Record<string, AprimoLink>;
};

type AprimoClassification = {
  id: string;
  name?: string;
  hasChildren?: boolean;
  _embedded?: {
    children?: { _embedded?: { item?: AprimoClassification[] } };
  };
  _links?: Record<string, AprimoLink>;
};

type AprimoSearchRequest = {
  searchExpression: {
    expression: string;
    parameters?: string[];
    namedParameters?: Record<string, string>;
    supportWildcards?: boolean;
    defaultLogicalOperator?: string;
  };
};

type AprimoSearchResponse = {
  page?: number;
  pageSize?: number;
  totalCount?: number;
  items?: AprimoRecord[];
};

// -- Connector implementation --

export default class AprimoConnector implements Media.MediaConnector {
  private runtime: Connector.ConnectorRuntimeContext;

  constructor(runtime: Connector.ConnectorRuntimeContext) {
    this.runtime = runtime;
  }

  private get baseUrl(): string {
    const url = this.runtime.options['BASE_URL'] as string;
    if (!url) {
      throw new Error('"BASE_URL" is not defined in the runtime options');
    }
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }

  // -- MediaConnector interface --

  async query(
    options: Connector.QueryOptions,
    context: Connector.Dictionary
  ): Promise<Media.MediaPage> {
    const page = Number(options.pageToken) || 1;
    const pageSize = options.pageSize || 20;
    const filter = options.filter?.[0] ?? '';
    const collection = options.collection ?? null;

    if (checkQueryBeforeDownload(options)) {
      return this.handleQueryBeforeDownload(filter, pageSize);
    }

    const classificationFilter = (context['classificationFilter'] as string) || '';

    if (collection && collection !== '/') {
      return this.handleClassificationBrowse(collection, page, pageSize);
    }

    const searchQuery = (context['searchQuery'] as string) || '';
    const contentTypeFilter = (context['contentType'] as string) || '';
    const searchText = filter || searchQuery;

    if (searchText || classificationFilter || contentTypeFilter) {
      return this.handleSearch(
        searchText,
        classificationFilter,
        contentTypeFilter,
        page,
        pageSize
      );
    }

    if (collection === '/') {
      return this.handleClassificationRoot(page, pageSize);
    }

    return this.handleDefaultListing(page, pageSize);
  }

  async detail(
    id: string,
    context: Connector.Dictionary
  ): Promise<Media.MediaDetail> {
    const record = await this.getRecord(id, [
      'masterFileLatestVersion',
      'fields',
    ]);
    return recordToMediaDetail(record);
  }

  async download(
    id: string,
    previewType: Media.DownloadType,
    intent: Media.DownloadIntent,
    context: Connector.Dictionary
  ): Promise<Connector.ArrayBufferPointer> {
    switch (previewType) {
      case 'thumbnail':
        return this.downloadImage(id, 'thumbnail');
      case 'mediumres':
      case 'highres':
        return this.downloadImage(id, 'preview');
      case 'fullres':
      case 'original':
      default:
        return this.downloadMasterFile(id);
    }
  }

  getConfigurationOptions(): Connector.ConnectorConfigValue[] | null {
    return [
      {
        name: 'searchQuery',
        displayName: 'Default search query',
        type: 'text',
      },
      {
        name: 'classificationFilter',
        displayName: 'Classification filter (ID or name path)',
        type: 'text',
      },
      {
        name: 'contentType',
        displayName: 'Content type filter',
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

  // -- Query handlers --

  private async handleQueryBeforeDownload(
    id: string,
    pageSize: number
  ): Promise<Media.MediaPage> {
    const record = await this.getRecord(id, ['masterFileLatestVersion']);
    return {
      pageSize: pageSize,
      data: [recordToMedia(record)],
      links: { nextPage: '' },
    };
  }

  private async handleClassificationRoot(
    page: number,
    pageSize: number
  ): Promise<Media.MediaPage> {
    const resp = await this.aprimoFetch(
      `/classifications?pageSize=${pageSize}&page=${page}`,
      { method: 'GET' }
    );
    const data = JSON.parse(resp.text) as AprimoPagedResponse<AprimoClassification>;
    const items = data._embedded?.item ?? data.items ?? [];

    const mediaItems: Media.Media[] = items.map((c) =>
      classificationToMedia(c)
    );
    const totalCount = data.totalCount ?? 0;
    const hasMore = page * pageSize < totalCount;

    return {
      pageSize: pageSize,
      data: mediaItems,
      links: { nextPage: hasMore ? `${page + 1}` : '' },
    };
  }

  private async handleClassificationBrowse(
    collection: string,
    page: number,
    pageSize: number
  ): Promise<Media.MediaPage> {
    const parts = collection.split('/').filter((s) => s && s !== '..');
    const classificationId = parts[parts.length - 1];

    if (!classificationId) {
      return this.handleClassificationRoot(page, pageSize);
    }

    const classification = await this.getClassification(classificationId);
    const children =
      classification._embedded?.children?._embedded?.item ?? [];

    if (children.length > 0 && page === 1) {
      const parentPath =
        parts.length > 1
          ? '/' + parts.slice(0, -1).join('/') + '/'
          : '/';

      const mediaItems: Media.Media[] = [
        {
          id: 'back',
          name: '../',
          relativePath: parentPath,
          type: 1,
          metaData: {},
        },
        ...children.map((c) => classificationToMedia(c, collection)),
      ];

      const records = await this.searchRecordsByClassification(
        classificationId,
        page,
        pageSize
      );
      const recordItems = (records.items ?? []).map((r) => recordToMedia(r));
      mediaItems.push(...recordItems);

      const totalCount = records.totalCount ?? 0;
      const hasMore = page * pageSize < totalCount;

      return {
        pageSize: pageSize,
        data: mediaItems,
        links: { nextPage: hasMore ? `${page + 1}` : '' },
      };
    }

    const records = await this.searchRecordsByClassification(
      classificationId,
      page,
      pageSize
    );

    const mediaItems: Media.Media[] = [];
    if (page === 1) {
      const parentPath =
        parts.length > 1
          ? '/' + parts.slice(0, -1).join('/') + '/'
          : '/';
      mediaItems.push({
        id: 'back',
        name: '../',
        relativePath: parentPath,
        type: 1,
        metaData: {},
      });
    }

    const recordItems = (records.items ?? []).map((r) => recordToMedia(r));
    mediaItems.push(...recordItems);

    const totalCount = records.totalCount ?? 0;
    const hasMore = page * pageSize < totalCount;

    return {
      pageSize: pageSize,
      data: mediaItems,
      links: { nextPage: hasMore ? `${page + 1}` : '' },
    };
  }

  private async handleSearch(
    searchText: string,
    classificationFilter: string,
    contentTypeFilter: string,
    page: number,
    pageSize: number
  ): Promise<Media.MediaPage> {
    const expressionParts: string[] = [];

    if (searchText) {
      expressionParts.push(`'${escapeSearchValue(searchText)}'`);
    }
    if (classificationFilter) {
      expressionParts.push(
        `ClassificationTree = '${escapeSearchValue(classificationFilter)}'`
      );
    }
    if (contentTypeFilter) {
      expressionParts.push(
        `ContentType = '${escapeSearchValue(contentTypeFilter)}'`
      );
    }

    const expression = expressionParts.join(' AND ');
    const results = await this.searchRecords(expression, page, pageSize);
    const items = (results.items ?? []).map((r) => recordToMedia(r));
    const totalCount = results.totalCount ?? 0;
    const hasMore = page * pageSize < totalCount;

    return {
      pageSize: pageSize,
      data: items,
      links: { nextPage: hasMore ? `${page + 1}` : '' },
    };
  }

  private async handleDefaultListing(
    page: number,
    pageSize: number
  ): Promise<Media.MediaPage> {
    const resp = await this.aprimoFetch(
      `/records?pageSize=${pageSize}&page=${page}`,
      {
        method: 'GET',
        headers: { 'select-record': 'masterFileLatestVersion' },
      }
    );
    const data = JSON.parse(resp.text) as AprimoPagedResponse<AprimoRecord>;
    const records = data._embedded?.item ?? data.items ?? [];
    const items = records.map((r) => recordToMedia(r));
    const totalCount = data.totalCount ?? 0;
    const hasMore = page * pageSize < totalCount;

    return {
      pageSize: pageSize,
      data: items,
      links: { nextPage: hasMore ? `${page + 1}` : '' },
    };
  }

  // -- Download helpers --

  private async downloadImage(
    recordId: string,
    type: 'thumbnail' | 'preview'
  ): Promise<Connector.ArrayBufferPointer> {
    try {
      const imageResp = await this.aprimoFetch(
        `/record/${recordId}/image/${type}`,
        { method: 'GET' }
      );
      const imageData = JSON.parse(imageResp.text);
      const uri: string | undefined = imageData.uri;
      if (!uri) {
        return this.downloadMasterFile(recordId);
      }
      const binaryResp = await this.runtime.fetch(uri, { method: 'GET' });
      if (!binaryResp.ok) {
        return this.downloadMasterFile(recordId);
      }
      return binaryResp.arrayBuffer;
    } catch {
      return this.downloadMasterFile(recordId);
    }
  }

  private async downloadMasterFile(
    recordId: string
  ): Promise<Connector.ArrayBufferPointer> {
    const record = await this.getRecord(recordId, [
      'masterFileLatestVersion',
    ]);

    const masterFile = record._embedded?.masterFileLatestVersion;
    const downloadLink =
      masterFile?._links?.['download-file']?.href ??
      masterFile?._links?.['download']?.href;

    if (!downloadLink) {
      throw new ConnectorHttpError(
        404,
        'Aprimo: No master file download link available for this record'
      );
    }

    const downloadUrl = downloadLink.startsWith('http')
      ? downloadLink
      : `${this.baseUrl}${downloadLink}`;

    const binaryResp = await this.runtime.fetch(downloadUrl, {
      method: 'GET',
    });
    if (!binaryResp.ok) {
      throw new ConnectorHttpError(
        binaryResp.status,
        `Aprimo: Master file download failed ${binaryResp.status} - ${binaryResp.statusText}`
      );
    }
    return binaryResp.arrayBuffer;
  }

  // -- Aprimo API helpers --

  private async aprimoFetch(
    path: string,
    init: {
      method: string;
      headers?: Record<string, string>;
      body?: string;
    }
  ) {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'API-VERSION': '1',
      Accept: 'application/hal+json',
      ...init.headers,
    };

    const resp = await this.runtime.fetch(url, {
      method: init.method,
      headers: headers,
      body: init.body ?? undefined,
    });

    if (!resp.ok) {
      throw new ConnectorHttpError(
        resp.status,
        `Aprimo: Request failed ${init.method} ${path} - ${resp.status} ${resp.statusText}`
      );
    }

    return resp;
  }

  private async getRecord(
    id: string,
    selects: string[]
  ): Promise<AprimoRecord> {
    const headers: Record<string, string> = {};
    if (selects.length > 0) {
      headers['select-record'] = selects.join(', ');
    }
    const resp = await this.aprimoFetch(`/record/${id}`, {
      method: 'GET',
      headers,
    });
    return JSON.parse(resp.text) as AprimoRecord;
  }

  private async getClassification(
    id: string
  ): Promise<AprimoClassification> {
    const resp = await this.aprimoFetch(`/classification/${id}`, {
      method: 'GET',
      headers: { 'select-classification': 'children' },
    });
    return JSON.parse(resp.text) as AprimoClassification;
  }

  private async searchRecords(
    expression: string,
    page: number,
    pageSize: number
  ): Promise<AprimoSearchResponse> {
    const body: AprimoSearchRequest = {
      searchExpression: {
        expression,
        supportWildcards: true,
        defaultLogicalOperator: 'AND',
      },
    };

    const resp = await this.aprimoFetch(
      `/search/records?pageSize=${pageSize}&page=${page}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'select-record': 'masterFileLatestVersion',
        },
        body: JSON.stringify(body),
      }
    );
    return JSON.parse(resp.text) as AprimoSearchResponse;
  }

  private async searchRecordsByClassification(
    classificationId: string,
    page: number,
    pageSize: number
  ): Promise<AprimoSearchResponse> {
    return this.searchRecords(
      `ClassificationTree = '${escapeSearchValue(classificationId)}'`,
      page,
      pageSize
    );
  }
}

// -- Pure mapping functions --

function checkQueryBeforeDownload(options: Connector.QueryOptions): boolean {
  return !options.collection && options.filter?.length === 1;
}

function recordToMedia(record: AprimoRecord): Media.Media {
  const masterFile = record._embedded?.masterFileLatestVersion;
  const fileName = masterFile?.fileName ?? record.title ?? record.id;
  const extension = masterFile?.fileExtension?.replace(/^\./, '') ?? '';

  return {
    id: record.id,
    name: fileName,
    relativePath: '/',
    type: 0,
    extension: extension || undefined,
    metaData: parseMetadata(record),
  };
}

function recordToMediaDetail(record: AprimoRecord): Media.MediaDetail {
  const masterFile = record._embedded?.masterFileLatestVersion;

  return {
    ...recordToMedia(record),
    width: masterFile?.width,
    height: masterFile?.height,
  };
}

function classificationToMedia(
  classification: AprimoClassification,
  parentPath?: string
): Media.Media {
  const basePath = parentPath
    ? parentPath.endsWith('/')
      ? parentPath
      : parentPath + '/'
    : '/';

  return {
    id: classification.id,
    name: classification.name ?? classification.id,
    relativePath: `${basePath}${classification.id}`,
    type: 1,
    metaData: {},
  };
}

function parseMetadata(
  record: AprimoRecord
): Record<string, string | boolean> {
  const meta: Record<string, string | boolean> = {};

  if (record.createdOn) meta['createdOn'] = record.createdOn;
  if (record.modifiedOn) meta['modifiedOn'] = record.modifiedOn;
  if (record.status) meta['status'] = record.status;
  if (record.tag) meta['tag'] = record.tag;
  if (record.title) meta['title'] = record.title;

  const masterFile = record._embedded?.masterFileLatestVersion;
  if (masterFile?.fileName) meta['fileName'] = masterFile.fileName;
  if (masterFile?.fileExtension)
    meta['fileExtension'] = masterFile.fileExtension;
  if (masterFile?.width != null) meta['width'] = String(masterFile.width);
  if (masterFile?.height != null) meta['height'] = String(masterFile.height);

  const fields = record._embedded?.fields?._embedded?.field;
  if (fields) {
    for (const field of fields) {
      const name = field.fieldName ?? field.id ?? 'unknown';
      const value = field.localizedValues?.[0]?.value ?? '';
      if (value) {
        meta[name] = value;
      }
    }
  }

  return meta;
}

function escapeSearchValue(value: string): string {
  return value.replace(/'/g, "''");
}
