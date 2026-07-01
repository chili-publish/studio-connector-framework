import {
  Connector,
  Data,
  BidirectionalDataPageItem,
} from '@chili-publish/studio-connectors';

// The property name injected on every row as the unique item identifier.
const ITEM_ID_PROPERTY = '__id__' as const;

// Salsify's system attribute for an item's own id — confirmed against the live
// PXM API (both records and digital assets expose "salsify:id").
const DEFAULT_ID_COLUMN = 'salsify:id';

// Which PXM collection to read. Modern record-model orgs expose products under
// "records"; the legacy product-model API uses "products". The request/response
// contract (per_page, meta.cursor, filter, /{id}) is identical for both, so the
// only difference is this one path segment.
const DEFAULT_RESOURCE = 'records';
const ALLOWED_RESOURCES = ['records', 'products'];

// Observed default page size on the live PXM API (per_page: 100). The real
// maximum is undocumented for PXM's cursor pagination, so cap conservatively;
// cursor paging fetches the rest regardless of page size.
const MAX_PAGE_SIZE = 100;
const MODEL_SAMPLE_SIZE = 5;

// Response shape confirmed against the live PXM API, e.g.
// GET app.salsify.com/api/v1/orgs/{org}/records?per_page=2 :
//   { "data": [ ... ], "meta": { "per_page": "2",
//       "cursor": "eyJzb3J0X3ZhbHVlcyI6WyJIVDAxQlIiXX0=", "total_entries": 76 } }
interface SalsifyListResponse {
  data?: Record<string, unknown>[];
  meta?: {
    // Opaque cursor for the *next* page. null/absent means no further page.
    // Forwarded back verbatim as the "cursor" query param on the following
    // call (round-trip verified live: page 1 -> cursor -> page 2 advances).
    cursor?: string | null;
    per_page?: string | number;
    total_entries?: number;
  };
}

export default class SalsifyConnector
  implements Data.DataConnector, Data.DataSourceVariableCapability
{
  private runtime: Connector.ConnectorRuntimeContext;

  constructor(runtime: Connector.ConnectorRuntimeContext) {
    this.runtime = runtime;
  }

  // ─── Public connector methods ─────────────────────────────────────────────

  async getPage(
    config: Data.BidirectionalPageConfig,
    context: Connector.Dictionary
  ): Promise<Data.BidirectionalDataPage> {
    return this.withTiming(async () => {
      if (config.limit < 1) {
        return { data: [], continuationToken: null, previousPageToken: null };
      }

      const idColumn = this.readIdColumn(context);
      const params: Record<string, string> = {
        per_page: String(Math.min(config.limit, MAX_PAGE_SIZE)),
      };
      const filterExpression = this.readFilterExpression(context);
      if (filterExpression) {
        params['filter'] = filterExpression;
      }
      if (config.continuationToken) {
        params['cursor'] = config.continuationToken;
      }

      const response = await this.fetchJson<SalsifyListResponse>(
        this.buildListUrl(params),
        'GET'
      );
      const items = response.data ?? [];

      return {
        data: items.map((item) => this.toDataItem(item, idColumn)),
        // Salsify's cursor is opaque and forward-only — there is no equivalent
        // of a previous-page token to hand back.
        continuationToken: response.meta?.cursor ?? null,
        previousPageToken: null,
      };
    }, 'getPage');
  }

  async getModel(
    context: Connector.Dictionary
  ): Promise<Data.DataSourceVariableDataModel> {
    return this.withTiming(async () => {
      const idColumn = this.readIdColumn(context);
      const params: Record<string, string> = {
        per_page: String(MODEL_SAMPLE_SIZE),
      };
      const filterExpression = this.readFilterExpression(context);
      if (filterExpression) {
        params['filter'] = filterExpression;
      }

      const response = await this.fetchJson<SalsifyListResponse>(
        this.buildListUrl(params),
        'GET'
      );
      const items = response.data ?? [];
      if (items.length === 0) {
        throw new Error(
          'Salsify connector: cannot infer columns — no items returned ' +
            'for the given filter expression.'
        );
      }

      // Salsify items are freeform key/value attribute sets with no fixed
      // schema and no schema-introspection endpoint, so columns are inferred
      // from the union of keys across the sampled rows (an item missing an
      // attribute simply doesn't contribute to that column on that row).
      const columns = new Map<string, Data.DataModelProperty['type']>();
      for (const item of items) {
        for (const [key, value] of Object.entries(item)) {
          if (key === idColumn || columns.has(key)) continue;
          columns.set(key, this.inferTypeFromValue(value));
        }
      }

      return {
        properties: [
          ...Array.from(columns, ([name, type]) => ({ name, type })),
          { name: ITEM_ID_PROPERTY, type: 'singleLine' },
        ],
        itemIdPropertyName: ITEM_ID_PROPERTY,
      };
    }, 'getModel');
  }

  async getPageItemById(
    id: string,
    _pageOptions: Data.PageItemOptions,
    context: Connector.Dictionary
  ): Promise<BidirectionalDataPageItem> {
    return this.withTiming(async () => {
      const idColumn = this.readIdColumn(context);
      const orgId = this.requireOption('SALSIFY_ORG_ID');
      const url =
        `https://app.salsify.com/api/v1/orgs/${encodeURIComponent(orgId)}` +
        `/${this.readResource()}/${encodeURIComponent(id)}`;
      const item = await this.fetchJson<Record<string, unknown>>(url, 'GET');
      return {
        data: this.toDataItem(item, idColumn),
        continuationToken: null,
        previousPageToken: null,
      };
    }, 'getPageItemById');
  }

  getCapabilities(): Data.DataConnectorCapabilities {
    return {
      // Server-side narrowing is verified to work, but it happens through the
      // raw Salsify filter-expression field, not the framework's own
      // DataFilter[]/DataSorting[] shape — so the framework-level flags stay
      // off to avoid two overlapping query mechanisms in the binding UI.
      filtering: false,
      sorting: false,
      model: true,
      dataSourceVariable: true,
    };
  }

  getConfigurationOptions(): Connector.ConnectorConfigValue[] | null {
    return [
      {
        name: 'filterExpression',
        displayName: 'Salsify filter expression',
        type: 'text',
        helpText:
          'Optional. Raw Salsify filter-language expression, e.g. ' +
          "='Brand':'Touqe International'. Passed through as-is as the " +
          '"filter" query param. Leave blank to return all items.',
      },
      {
        name: 'idColumn',
        displayName: 'Id field name',
        type: 'text',
        helpText:
          `Optional. Name of the Salsify attribute holding the item id. ` +
          `Defaults to "${DEFAULT_ID_COLUMN}".`,
      },
    ];
  }

  // ─── Private helpers ────────────────────────────────────────────────────

  private readFilterExpression(context: Connector.Dictionary): string {
    return String(context['filterExpression'] ?? '').trim();
  }

  private readResource(): string {
    const raw = String(this.runtime.options['SALSIFY_RESOURCE'] ?? '')
      .trim()
      .toLowerCase();
    if (!raw) return DEFAULT_RESOURCE;
    if (!ALLOWED_RESOURCES.includes(raw)) {
      throw new Error(
        `Salsify connector: SALSIFY_RESOURCE must be one of ` +
          `${ALLOWED_RESOURCES.join(', ')} (got "${raw}").`
      );
    }
    return raw;
  }

  private readIdColumn(context: Connector.Dictionary): string {
    const value = String(context['idColumn'] ?? '').trim();
    return value || DEFAULT_ID_COLUMN;
  }

  private inferTypeFromValue(value: unknown): Data.DataModelProperty['type'] {
    if (value === null || value === undefined) return 'singleLine';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (
      typeof value === 'string' &&
      /^\d{4}-\d{2}-\d{2}(T[\d:.Z+-]+)?$/.test(value)
    ) {
      return 'date';
    }
    return 'singleLine';
  }

  private toDataItem(
    source: Record<string, unknown>,
    idColumn: string
  ): Data.DataItem {
    const idValue = source[idColumn];
    const item: Record<string, unknown> = {
      [ITEM_ID_PROPERTY]: idValue == null ? '' : String(idValue),
    };
    for (const [key, value] of Object.entries(source)) {
      if (key === idColumn) continue;
      item[key] = this.coerce(value);
    }
    return item as Data.DataItem;
  }

  private coerce(value: unknown): string | number | boolean | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'boolean') return value;
    // Salsify multi-select/list-valued attributes have no scalar equivalent
    // in the framework's DataItem contract — join into one delimited string.
    if (Array.isArray(value)) return value.map((v) => String(v)).join('|');
    return JSON.stringify(value);
  }

  private buildListUrl(params: Record<string, string>): string {
    const orgId = this.requireOption('SALSIFY_ORG_ID');
    const base = `https://app.salsify.com/api/v1/orgs/${encodeURIComponent(orgId)}/${this.readResource()}`;
    const search = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    return `${base}${search ? `?${search}` : ''}`;
  }

  private async fetchJson<T>(url: string, method: 'GET'): Promise<T> {
    const init: Connector.ChiliRequestInit = {
      method,
      headers: { Accept: 'application/json' },
    };
    const label = `fetch ${method} ${this.describeUrl(url)}`;
    const now = this.monotonicNow();
    const start = now();
    let response = await this.withTiming(
      () => this.runtime.fetch(url, init),
      label
    );
    // The platform auth layer is known to misfire its token path once on a
    // cold start (401, then the static key works on the next attempt). In the
    // editor a human retries; in headless renders nobody does, so retry once
    // here — but only when the 401 came back fast, since re-issuing a request
    // that already burned seconds risks the 10s output-job ceiling.
    if (response.status === 401 && now() - start < 2000) {
      response = await this.withTiming(
        () => this.runtime.fetch(url, init),
        `${label} (retry after 401)`
      );
    }
    if (!response.ok) {
      const body =
        typeof response.text === 'string' && response.text.length > 0
          ? response.text.slice(0, 500)
          : '(no body)';
      throw new ConnectorHttpError(
        response.status,
        `Salsify connector: ${method} ${url} failed — ${response.status} ${response.statusText} — ${body}`
      );
    }
    const text = response.text;
    if (!text || text.trim() === '') {
      return {} as T;
    }
    try {
      return JSON.parse(text) as T;
    } catch (e) {
      throw new Error(
        `Salsify connector: invalid JSON response: ${(e as Error).message}`
      );
    }
  }

  /**
   * Reduces a full request URL to its path + query for log labels, e.g.
   * "https://app.salsify.com/api/v1/orgs/x/products?limit=5" ->
   * "/api/v1/orgs/x/products?limit=5". Keeps the host out of the log.
   */
  private describeUrl(url: string): string {
    const idx = url.indexOf('/api/');
    return idx >= 0 ? url.slice(idx) : url;
  }

  /**
   * Runs an async function and, when the `logTiming` runtime option is
   * enabled, logs how long it took. Wrapped at two levels — the whole method
   * ("getPage") and the raw network round-trip nested inside it
   * ("fetch GET /products?..."). Comparing the two pinpoints where a slow
   * data binding spends its time. Zero-overhead no-op when the flag is off.
   */
  private async withTiming<T>(
    fn: () => Promise<T>,
    label: string
  ): Promise<T> {
    if (!this.isFlagOn('logTiming')) {
      return fn();
    }
    const now = this.monotonicNow();
    const start = now();
    try {
      const result = await fn();
      const seconds = ((now() - start) / 1000).toFixed(3);
      this.runtime.logError(`[Salsify][Timing] ${label} took ${seconds}s`);
      return result;
    } catch (error) {
      const seconds = ((now() - start) / 1000).toFixed(3);
      this.runtime.logError(
        `[Salsify][Timing] ${label} failed after ${seconds}s`
      );
      throw error;
    }
  }

  private monotonicNow(): () => number {
    return typeof performance !== 'undefined' &&
      typeof performance.now === 'function'
      ? () => performance.now()
      : () => Date.now();
  }

  private isFlagOn(name: string): boolean {
    const raw = this.runtime.options[name];
    if (typeof raw === 'boolean') return raw;
    return typeof raw === 'string' && raw.trim().toLowerCase() === 'true';
  }

  private requireOption(key: string): string {
    const value = this.runtime.options[key];
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(
        `Salsify connector: runtime option "${key}" is required.`
      );
    }
    return value;
  }
}
