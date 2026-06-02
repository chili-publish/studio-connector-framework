/**
 * Contentful data connector — read-only, against the Content Delivery API (CDA).
 *
 * Per-template the designer chooses a `contentType` (and optionally a `locale`);
 * the admin sets the space / environment / base host as runtime options. Auth is
 * a CDA delivery token injected by the framework's `staticKey` slot — this code
 * never sets the Authorization header itself.
 *
 * Linked assets are resolved (via `include=1`) to public `images.ctfassets.net`
 * URLs so a paired URL media connector can render them in image frames. Rich text,
 * arrays, locations and other non-scalar fields are flattened to strings, because
 * a Studio row value must be string | number | boolean | Date | null.
 *
 * Modelled on the CSV connector (src/connectors/csv/connector.ts) for the
 * DataSourceVariableCapability contract (getPage / getModel / getPageItemById).
 */
import {
  Connector,
  Data,
  DataFilter,
  DataSorting,
  BidirectionalDataPageItem,
} from '@chili-publish/studio-connectors';

// The property name injected on every row as the unique item identifier.
const ITEM_ID_PROPERTY = '__id__' as const;

type ColumnType = 'singleLine' | 'multiLine' | 'number' | 'boolean' | 'date';

interface ColumnSpec {
  name: string;
  type: ColumnType;
}

// ─── Contentful CDA response shapes (only the parts we read) ──────────────────

interface CdaLink {
  sys: { type: 'Link'; linkType: 'Asset' | 'Entry'; id: string };
}

interface CdaSys {
  id: string;
  type: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CdaEntry {
  sys: CdaSys;
  fields: Record<string, unknown>;
}

interface CdaAsset {
  sys: CdaSys;
  fields: {
    title?: string;
    file?: { url?: string; contentType?: string };
  };
}

interface CdaEntriesResponse {
  total: number;
  skip: number;
  limit: number;
  items: CdaEntry[];
  includes?: {
    Asset?: CdaAsset[];
    Entry?: CdaEntry[];
  };
}

interface CdaContentTypeField {
  id: string;
  name: string;
  type: string; // Symbol | Text | Integer | Number | Date | Boolean | Location | RichText | Link | Array | Object
  linkType?: string;
  items?: { type?: string; linkType?: string };
}

interface CdaContentType {
  sys: CdaSys;
  fields: CdaContentTypeField[];
}

// ─── Connector ────────────────────────────────────────────────────────────────

export default class ContentfulConnector
  implements Data.DataConnector, Data.DataSourceVariableCapability
{
  private runtime: Connector.ConnectorRuntimeContext;
  // Cache the resolved column model per (contentType|locale) binding.
  private modelCache: Map<string, ColumnSpec[]> = new Map();

  constructor(runtime: Connector.ConnectorRuntimeContext) {
    this.runtime = runtime;
  }

  // ─── Public connector methods ─────────────────────────────────────────────

  async getPage(
    config: Data.BidirectionalPageConfig,
    context: Connector.Dictionary
  ): Promise<Data.BidirectionalDataPage> {
    if (config.limit < 1) {
      return { data: [], continuationToken: null, previousPageToken: null };
    }

    const skip = this.parseOffset(
      config.continuationToken,
      config.previousPageToken,
      config.limit
    );

    const params: Record<string, string> = {
      content_type: this.requireContext(context, 'contentType'),
      skip: String(skip),
      limit: String(config.limit),
      include: '1',
    };
    this.applyLocale(params, context);
    this.applyFilters(params, config.filters);
    this.applySorting(params, config.sorting);

    const response = await this.fetchEntries(params);
    const assetMap = this.buildAssetMap(response);
    const columns = await this.resolveColumns(context);

    const data = response.items.map((entry) =>
      this.toDataItem(entry, columns, assetMap)
    );

    const endIndex = response.skip + response.items.length;
    return {
      data,
      continuationToken: endIndex < response.total ? String(endIndex) : null,
      previousPageToken: response.skip > 0 ? String(response.skip) : null,
    };
  }

  async getModel(
    context: Connector.Dictionary
  ): Promise<Data.DataSourceVariableDataModel> {
    const columns = await this.resolveColumns(context);
    return {
      properties: columns.map((c) => ({
        name: c.name,
        type: c.type as Data.DataModelProperty['type'],
      })),
      itemIdPropertyName: ITEM_ID_PROPERTY,
    };
  }

  async getPageItemById(
    id: string,
    _pageOptions: Data.PageItemOptions,
    context: Connector.Dictionary
  ): Promise<BidirectionalDataPageItem> {
    if (!id || id.trim().length === 0) {
      throw new Error('Contentful connector: empty item id.');
    }

    // Query the collection endpoint filtered by sys.id so `include=1` resolves
    // linked assets — the single-entry endpoint does not return an includes block.
    const params: Record<string, string> = {
      content_type: this.requireContext(context, 'contentType'),
      'sys.id': id,
      include: '1',
      limit: '1',
    };
    this.applyLocale(params, context);

    const response = await this.fetchEntries(params);
    const entry = response.items[0];
    if (!entry) {
      throw new Error(`Contentful connector: entry "${id}" not found.`);
    }

    const assetMap = this.buildAssetMap(response);
    const columns = await this.resolveColumns(context);
    return {
      data: this.toDataItem(entry, columns, assetMap),
      continuationToken: null,
      previousPageToken: null,
    };
  }

  getCapabilities(): Data.DataConnectorCapabilities {
    return {
      filtering: true,
      sorting: true,
      model: true,
      dataSourceVariable: true,
    };
  }

  getConfigurationOptions(): Connector.ConnectorConfigValue[] | null {
    return [
      {
        name: 'contentType',
        displayName: 'Content Type ID',
        type: 'text',
        helpText:
          'The API identifier of the Contentful content type to read (e.g. "product", "blogPost").',
      },
      {
        name: 'locale',
        displayName: 'Locale',
        type: 'text',
        helpText:
          'Optional locale code (e.g. "en-US"). Leave blank for the space default. Do not use "*" — multi-locale responses cannot be flattened to single values.',
      },
      {
        name: 'columnsOverride',
        displayName: 'Columns override (JSON)',
        type: 'text',
        helpText:
          'Optional. Paste [{"name":"title","type":"singleLine"}, ...] to bypass automatic schema discovery.',
      },
    ];
  }

  // ─── Schema discovery ──────────────────────────────────────────────────────

  /**
   * Resolve column schema. Order:
   *  1. columnsOverride from per-template context (escape hatch)
   *  2. cached discovered model for this content type / locale
   *  3. GET /content_types/{id} and map field types
   */
  private async resolveColumns(
    context: Connector.Dictionary
  ): Promise<ColumnSpec[]> {
    const override = this.parseColumnsOverride(context['columnsOverride']);
    if (override) return override;

    const contentType = this.requireContext(context, 'contentType');
    const cacheKey = `${contentType}|${this.localeOf(context)}`;
    const cached = this.modelCache.get(cacheKey);
    if (cached) return cached;

    const discovered = await this.discoverColumns(contentType);
    this.modelCache.set(cacheKey, discovered);
    return discovered;
  }

  private async discoverColumns(contentType: string): Promise<ColumnSpec[]> {
    const url = this.buildUrl(
      `/content_types/${encodeURIComponent(contentType)}`
    );
    const ct = await this.fetchJson<CdaContentType>(url);
    if (!ct || !Array.isArray(ct.fields)) {
      throw new Error(
        `Contentful connector: content type "${contentType}" returned no field definitions.`
      );
    }

    const columns: ColumnSpec[] = ct.fields.map((f) => ({
      name: f.id,
      type: this.mapFieldType(f),
    }));

    // Useful system columns, always available on an entry.
    columns.push({ name: 'sys.createdAt', type: 'date' });
    columns.push({ name: 'sys.updatedAt', type: 'date' });
    columns.push({ name: ITEM_ID_PROPERTY, type: 'singleLine' });
    return columns;
  }

  private mapFieldType(field: CdaContentTypeField): ColumnType {
    switch (field.type) {
      case 'Integer':
      case 'Number':
        return 'number';
      case 'Boolean':
        return 'boolean';
      case 'Date':
        return 'date';
      case 'Text':
      case 'RichText':
        return 'multiLine';
      // Symbol, Location, Link (Asset URL / Entry id), Array, Object → flattened to a string.
      default:
        return 'singleLine';
    }
  }

  private parseColumnsOverride(raw: unknown): ColumnSpec[] | null {
    if (typeof raw !== 'string' || raw.trim() === '') return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      throw new Error(
        `Contentful connector: invalid columnsOverride JSON: ${
          (e as Error).message
        }`
      );
    }
    if (!Array.isArray(parsed)) return null;
    const result: ColumnSpec[] = [];
    for (const entry of parsed) {
      if (
        entry &&
        typeof entry === 'object' &&
        typeof (entry as { name?: unknown }).name === 'string'
      ) {
        const e = entry as { name: string; type?: unknown };
        result.push({ name: e.name, type: this.normaliseType(e.type) });
      }
    }
    if (result.length === 0) return null;
    // Ensure the id property is present so getModel always has an item id.
    if (!result.some((c) => c.name === ITEM_ID_PROPERTY)) {
      result.push({ name: ITEM_ID_PROPERTY, type: 'singleLine' });
    }
    return result;
  }

  private normaliseType(type: unknown): ColumnType {
    const valid: ColumnType[] = [
      'singleLine',
      'multiLine',
      'number',
      'boolean',
      'date',
    ];
    return typeof type === 'string' && (valid as string[]).includes(type)
      ? (type as ColumnType)
      : 'singleLine';
  }

  // ─── Query parameter translation ─────────────────────────────────────────

  private applyLocale(
    params: Record<string, string>,
    context: Connector.Dictionary
  ): void {
    const locale = this.localeOf(context);
    if (locale) params['locale'] = locale;
  }

  private localeOf(context: Connector.Dictionary): string {
    const raw = context['locale'];
    const locale = typeof raw === 'string' ? raw.trim() : '';
    if (locale === '*') {
      throw new Error(
        'Contentful connector: locale "*" is not supported — pick a single locale so field values stay scalar.'
      );
    }
    return locale;
  }

  private applyFilters(
    params: Record<string, string>,
    filters: DataFilter[] | null | undefined
  ): void {
    if (!filters) return;
    for (const filter of filters) {
      if (!filter || typeof filter.property !== 'string') continue;
      // sys.* properties filter directly; everything else is an entry field.
      const key = filter.property.startsWith('sys.')
        ? filter.property
        : `fields.${filter.property}`;
      if (filter.type === 'exact') {
        params[key] = filter.value;
      } else {
        // 'contains' → CDA full-text match on the field.
        params[`${key}[match]`] = filter.value;
      }
    }
  }

  private applySorting(
    params: Record<string, string>,
    sorting: DataSorting[] | null | undefined
  ): void {
    if (!sorting || sorting.length === 0) return;
    const order = sorting
      .filter((s) => s && typeof s.property === 'string')
      .map((s) => {
        const key = s.property.startsWith('sys.')
          ? s.property
          : `fields.${s.property}`;
        return s.direction === 'desc' ? `-${key}` : key;
      });
    if (order.length > 0) params['order'] = order.join(',');
  }

  // ─── Asset resolution + row flattening ───────────────────────────────────

  /** Map of asset id → absolute, optionally width-constrained image URL. */
  private buildAssetMap(response: CdaEntriesResponse): Map<string, string> {
    const map = new Map<string, string>();
    const assets = response.includes?.Asset ?? [];
    const width = this.imageWidth();
    for (const asset of assets) {
      const rawUrl = asset.fields?.file?.url;
      if (!asset.sys?.id || !rawUrl) continue;
      map.set(asset.sys.id, this.absoluteAssetUrl(rawUrl, width));
    }
    return map;
  }

  private absoluteAssetUrl(url: string, width: string): string {
    // Contentful asset URLs come back protocol-relative ("//images.ctfassets.net/...").
    let abs = url.startsWith('//') ? `https:${url}` : url;
    if (width) {
      abs += `${abs.includes('?') ? '&' : '?'}w=${encodeURIComponent(width)}`;
    }
    return abs;
  }

  private imageWidth(): string {
    const raw = this.runtime.options['IMAGE_WIDTH'];
    const width = typeof raw === 'string' ? raw.trim() : '';
    return /^\d+$/.test(width) ? width : '';
  }

  private toDataItem(
    entry: CdaEntry,
    columns: ColumnSpec[],
    assetMap: Map<string, string>
  ): Data.DataItem {
    const fields = entry.fields ?? {};
    const item: Record<string, unknown> = {
      [ITEM_ID_PROPERTY]: entry.sys?.id ?? '',
    };
    for (const col of columns) {
      if (col.name === ITEM_ID_PROPERTY) continue;
      if (col.name === 'sys.createdAt') {
        item[col.name] = entry.sys?.createdAt ?? null;
        continue;
      }
      if (col.name === 'sys.updatedAt') {
        item[col.name] = entry.sys?.updatedAt ?? null;
        continue;
      }
      item[col.name] = this.flattenValue(fields[col.name], assetMap);
    }
    return item as Data.DataItem;
  }

  /** Collapse any Contentful field value to a Studio-legal scalar. */
  private flattenValue(
    value: unknown,
    assetMap: Map<string, string>
  ): string | number | boolean | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value;

    if (Array.isArray(value)) {
      const parts = value
        .map((v) => this.flattenScalar(v, assetMap))
        .filter((v) => v !== null && v !== '');
      return parts.length > 0 ? parts.join(', ') : null;
    }

    if (typeof value === 'object') {
      return this.flattenScalar(value, assetMap);
    }
    return null;
  }

  /** Flatten a single non-array value (link, rich text, location, object, scalar). */
  private flattenScalar(
    value: unknown,
    assetMap: Map<string, string>
  ): string | number | boolean | null {
    if (value === null || value === undefined) return null;
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value as string | number | boolean;
    }
    if (typeof value !== 'object') return null;

    const obj = value as Record<string, unknown>;

    // Resolved/linked asset or entry reference.
    const link = obj as unknown as CdaLink;
    if (link.sys && link.sys.type === 'Link') {
      if (link.sys.linkType === 'Asset') {
        return assetMap.get(link.sys.id) ?? null;
      }
      return link.sys.id; // Entry reference → expose the id for the POC.
    }

    // Rich text document.
    if (typeof obj['nodeType'] === 'string' && Array.isArray(obj['content'])) {
      const text = this.richTextToPlain(obj).trim();
      return text.length > 0 ? text : null;
    }

    // Location field.
    if (typeof obj['lat'] === 'number' && typeof obj['lon'] === 'number') {
      return `${obj['lat']},${obj['lon']}`;
    }

    // Anything else (arbitrary JSON object) → compact JSON string.
    try {
      return JSON.stringify(obj);
    } catch {
      return null;
    }
  }

  private richTextToPlain(node: Record<string, unknown>): string {
    if (typeof node['value'] === 'string') return node['value'];
    const content = node['content'];
    if (!Array.isArray(content)) return '';
    return content
      .map((child) =>
        child && typeof child === 'object'
          ? this.richTextToPlain(child as Record<string, unknown>)
          : ''
      )
      .join('');
  }

  // ─── HTTP ──────────────────────────────────────────────────────────────────

  private async fetchEntries(
    params: Record<string, string>
  ): Promise<CdaEntriesResponse> {
    const url = this.buildUrl('/entries', params);
    const data = await this.fetchJson<CdaEntriesResponse>(url);
    if (!data || !Array.isArray(data.items)) {
      throw new Error(
        'Contentful connector: unexpected entries response (no items array).'
      );
    }
    return data;
  }

  /**
   * Build a CDA URL: {baseUrl}/spaces/{space}/environments/{env}{path}?{params}.
   * The Authorization header is added by the framework's staticKey slot.
   */
  private buildUrl(path: string, params: Record<string, string> = {}): string {
    const base = this.requireOption('CONTENTFUL_BASE_URL').replace(/\/+$/, '');
    const space = this.requireOption('CONTENTFUL_SPACE_ID');
    const env = this.optionOr('CONTENTFUL_ENVIRONMENT', 'master');
    const root = `${base}/spaces/${encodeURIComponent(
      space
    )}/environments/${encodeURIComponent(env)}`;
    const search = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    return `${root}${path}${search ? `?${search}` : ''}`;
  }

  private async fetchJson<T>(url: string): Promise<T> {
    this.log(`GET ${url}`);
    const response = await this.runtime.fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      const detail =
        typeof response.text === 'string' && response.text.length > 0
          ? response.text.slice(0, 500)
          : '(no body)';
      throw new ConnectorHttpError(
        response.status,
        `Contentful connector: GET ${url} failed — ${response.status} ${response.statusText} — ${detail}`
      );
    }
    const text = response.text;
    if (!text || text.trim() === '') {
      throw new Error('Contentful connector: empty response body.');
    }
    try {
      return JSON.parse(text) as T;
    } catch (e) {
      throw new Error(
        `Contentful connector: invalid JSON response: ${(e as Error).message}`
      );
    }
  }

  // ─── Option / context helpers ───────────────────────────────────────────

  private parseOffset(
    continuationToken: string | null | undefined,
    previousPageToken: string | null | undefined,
    limit: number
  ): number {
    if (continuationToken) {
      const parsed = parseInt(continuationToken, 10);
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(
          `Contentful connector: invalid continuation token "${continuationToken}".`
        );
      }
      return parsed;
    }
    if (previousPageToken) {
      const tokenStart = parseInt(previousPageToken, 10);
      if (!Number.isFinite(tokenStart) || tokenStart < 0) {
        throw new Error(
          `Contentful connector: invalid previous page token "${previousPageToken}".`
        );
      }
      return Math.max(0, tokenStart - limit);
    }
    return 0;
  }

  private requireOption(key: string): string {
    const value = this.runtime.options[key];
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(
        `Contentful connector: runtime option "${key}" is required.`
      );
    }
    return value.trim();
  }

  private optionOr(key: string, fallback: string): string {
    const value = this.runtime.options[key];
    return typeof value === 'string' && value.trim() !== ''
      ? value.trim()
      : fallback;
  }

  private requireContext(context: Connector.Dictionary, key: string): string {
    const value = context[key];
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(
        `Contentful connector: configuration option "${key}" is required.`
      );
    }
    return value.trim();
  }

  private log(message: string): void {
    const raw = this.runtime.options['logEnabled'];
    const on =
      raw === true ||
      (typeof raw === 'string' && raw.trim().toLowerCase() === 'true');
    if (on) this.runtime.logError(`[contentful] ${message}`);
  }
}
