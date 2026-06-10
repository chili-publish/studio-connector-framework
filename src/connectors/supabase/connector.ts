import {
  Connector,
  Data,
  DataFilter,
  DataSorting,
  BidirectionalDataPageItem,
} from '@chili-publish/studio-connectors';

const ITEM_ID_PROPERTY = '__id__' as const;

type QueryMode = 'view' | 'rpc';

interface ColumnSpec {
  name: string;
  type: string;
}

interface ResolvedTarget {
  mode: QueryMode;
  name: string;
}

export default class SupabaseConnector
  implements Data.DataConnector, Data.DataSourceVariableCapability
{
  private runtime: Connector.ConnectorRuntimeContext;
  private modelCache: Map<string, ColumnSpec[]> = new Map();

  constructor(runtime: Connector.ConnectorRuntimeContext) {
    this.runtime = runtime;
  }

  async getPage(
    config: Data.BidirectionalPageConfig,
    context: Connector.Dictionary
  ): Promise<Data.BidirectionalDataPage> {
    return this.withTiming(async () => {
      if (config.limit < 1) {
        return { data: [], continuationToken: null, previousPageToken: null };
      }

      const target = this.readTarget(context);
      const idColumn = this.readIdColumn(context);
      const offset = this.parseOffset(
        config.continuationToken,
        config.previousPageToken,
        config.limit
      );

      const params: Record<string, string> = {
        limit: String(config.limit),
        offset: String(offset),
      };
      this.applyFilters(params, config.filters);
      this.applyConfiguredFilters(params, context);
      this.applySorting(params, config.sorting);

      const rows = await this.fetchRows(target, params, context);
      const columns = await this.resolveColumns(target, context, rows);

      return {
        data: rows.map((row) => this.toDataItem(row, columns, idColumn)),
        continuationToken:
          rows.length === config.limit ? String(offset + rows.length) : null,
        previousPageToken: offset > 0 ? String(offset) : null,
      };
    }, 'getPage');
  }

  async getModel(
    context: Connector.Dictionary
  ): Promise<Data.DataSourceVariableDataModel> {
    return this.withTiming(async () => {
      const target = this.readTarget(context);
      const columns = await this.resolveColumns(target, context);
      return {
        properties: [
          ...columns.map((c) => ({ name: c.name, type: c.type })),
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
      const target = this.readTarget(context);
      if (target.mode === 'rpc') {
        throw new Error(
          'Supabase connector: getPageItemById is not supported in rpc mode. Use a view to look up rows by id.'
        );
      }
      const idColumn = this.readIdColumn(context);
      const params: Record<string, string> = { limit: '1' };
      this.applyConfiguredFilters(params, context);
      params[idColumn] = `eq.${id}`; // id lookup always wins for its own column
      const url = this.buildUrl(
        `/rest/v1/${encodeURIComponent(target.name)}`,
        params
      );
      const rows = await this.fetchJson<Record<string, unknown>[]>(url, 'GET');
      if (!rows || rows.length === 0) {
        throw new Error(
          `Supabase connector: row with ${idColumn}="${id}" not found in "${target.name}".`
        );
      }
      const columns = await this.resolveColumns(target, context, rows);
      return {
        data: this.toDataItem(rows[0], columns, idColumn),
        continuationToken: null,
        previousPageToken: null,
      };
    }, 'getPageItemById');
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
        name: 'queryMode',
        displayName: 'Query mode (rpc or view)',
        type: 'text',
        helpText:
          '"rpc" calls a Postgres function (always available). "view" reads a table or view (requires admin to enable ALLOW_TABLE_VIEW). Defaults to "rpc".',
      },
      {
        name: 'targetName',
        displayName: 'Table / view / function name',
        type: 'text',
        helpText:
          'For rpc: function name. For view: table or view name.',
      },
      {
        name: 'idColumn',
        displayName: 'Primary key column',
        type: 'text',
        helpText:
          'Column used by getPageItemById to look up a single row. Defaults to "id". Only used in view mode.',
      },
      {
        name: 'rpcParams',
        displayName: 'RPC parameters (JSON object)',
        type: 'text',
        helpText:
          'Only used in rpc mode. JSON object passed as the function arguments.',
      },
      {
        name: 'filter',
        displayName: 'Filter (JSON object)',
        type: 'text',
        helpText:
          'Always-on filter applied to every query, e.g. {"campaign_slug":"spring-fresh"}. ' +
          'Values map to PostgREST "column=eq.value" by default; prefix a value with a ' +
          'PostgREST operator (e.g. "ilike.*coffee*", "gte.10") to use it verbatim.',
      },
      {
        name: 'columnsOverride',
        displayName: 'Columns override (JSON array)',
        type: 'text',
        helpText:
          'Optional. JSON array like [{"name":"foo","type":"singleLine"}]. Bypasses PostgREST OpenAPI auto-discovery.',
      },
    ];
  }

  // ─── Private helpers ──────────────────────────────────────────────────

  private readTarget(context: Connector.Dictionary): ResolvedTarget {
    const rawMode = String(context['queryMode'] ?? 'rpc').toLowerCase();
    const mode: QueryMode = rawMode === 'view' ? 'view' : 'rpc';

    if (mode === 'view' && !this.isFlagOn('ALLOW_TABLE_VIEW')) {
      throw new Error(
        'Supabase connector: "view" query mode is disabled in this environment. ' +
          'An admin can enable it by setting ALLOW_TABLE_VIEW=true in the Configuration tab.'
      );
    }

    const name = String(context['targetName'] ?? '').trim();
    if (!name) {
      throw new Error(
        'Supabase connector: configuration option "targetName" is required.'
      );
    }
    return { mode, name };
  }

  private isFlagOn(name: string): boolean {
    const raw = this.runtime.options[name];
    if (typeof raw === 'boolean') return raw;
    return typeof raw === 'string' && raw.trim().toLowerCase() === 'true';
  }

  private readIdColumn(context: Connector.Dictionary): string {
    const value = String(context['idColumn'] ?? '').trim();
    return value || 'id';
  }

  private parseOffset(
    continuationToken: string | null | undefined,
    previousPageToken: string | null | undefined,
    limit: number
  ): number {
    if (continuationToken) {
      const parsed = parseInt(continuationToken, 10);
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(
          `Supabase connector: invalid continuation token "${continuationToken}".`
        );
      }
      return parsed;
    }
    if (previousPageToken) {
      const tokenStart = parseInt(previousPageToken, 10);
      if (!Number.isFinite(tokenStart) || tokenStart < 0) {
        throw new Error(
          `Supabase connector: invalid previous page token "${previousPageToken}".`
        );
      }
      return Math.max(0, tokenStart - limit);
    }
    return 0;
  }

  private applyFilters(
    params: Record<string, string>,
    filters: DataFilter[] | null | undefined
  ): void {
    if (!filters) return;
    for (const filter of filters) {
      if (!filter || typeof filter.property !== 'string') continue;
      const value = String(filter.value ?? '');
      params[filter.property] =
        filter.type === 'exact' ? `eq.${value}` : `ilike.*${value}*`;
    }
  }

  private applyConfiguredFilters(
    params: Record<string, string>,
    context: Connector.Dictionary
  ): void {
    const raw = context['filter'];
    if (raw === undefined || raw === null || raw === '' || raw === false) {
      return;
    }
    const text = typeof raw === 'string' ? raw : String(raw);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      throw new Error(
        `Supabase connector: invalid filter JSON: ${(e as Error).message}`
      );
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(
        'Supabase connector: "filter" must be a JSON object like ' +
          '{"campaign_slug":"spring-fresh"}.'
      );
    }
    const operators = [
      'eq.',
      'neq.',
      'gt.',
      'gte.',
      'lt.',
      'lte.',
      'like.',
      'ilike.',
      'in.',
      'is.',
    ];
    for (const [col, val] of Object.entries(parsed as Record<string, unknown>)) {
      const value = String(val ?? '');
      params[col] = operators.some((op) => value.startsWith(op))
        ? value
        : `eq.${value}`;
    }
  }

  private applySorting(
    params: Record<string, string>,
    sorting: DataSorting[] | null | undefined
  ): void {
    if (!sorting || sorting.length === 0) return;
    const clauses = sorting
      .filter((s) => s && typeof s.property === 'string')
      .map((s) => `${s.property}.${s.direction === 'desc' ? 'desc' : 'asc'}`);
    if (clauses.length > 0) {
      params['order'] = clauses.join(',');
    }
  }

  private async fetchRows(
    target: ResolvedTarget,
    params: Record<string, string>,
    context: Connector.Dictionary
  ): Promise<Record<string, unknown>[]> {
    if (target.mode === 'view') {
      const url = this.buildUrl(
        `/rest/v1/${encodeURIComponent(target.name)}`,
        params
      );
      const data = await this.fetchJson<Record<string, unknown>[]>(url, 'GET');
      return data ?? [];
    }
    const rpcBody = this.parseRpcParams(context);
    const url = this.buildUrl(
      `/rest/v1/rpc/${encodeURIComponent(target.name)}`,
      params
    );
    const data = await this.fetchJson<Record<string, unknown>[]>(
      url,
      'POST',
      JSON.stringify(rpcBody)
    );
    return data ?? [];
  }

  private parseRpcParams(
    context: Connector.Dictionary
  ): Record<string, unknown> {
    const raw = context['rpcParams'];
    if (raw === undefined || raw === null || raw === '' || raw === false) {
      return {};
    }
    const text = typeof raw === 'string' ? raw : String(raw);
    try {
      const parsed: unknown = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      throw new Error('rpcParams must be a JSON object');
    } catch (e) {
      throw new Error(
        `Supabase connector: invalid rpcParams: ${(e as Error).message}`
      );
    }
  }

  private async resolveColumns(
    target: ResolvedTarget,
    context: Connector.Dictionary,
    sampleRows?: Record<string, unknown>[]
  ): Promise<ColumnSpec[]> {
    const override = context['columnsOverride'];
    if (typeof override === 'string' && override.trim() !== '') {
      try {
        const parsed: unknown = JSON.parse(override);
        if (Array.isArray(parsed)) {
          const result: ColumnSpec[] = [];
          for (const entry of parsed) {
            if (
              entry &&
              typeof entry === 'object' &&
              typeof (entry as { name?: unknown }).name === 'string'
            ) {
              const e = entry as { name: string; type?: unknown };
              result.push({
                name: e.name,
                type: this.normaliseColumnType(e.type),
              });
            }
          }
          if (result.length > 0) return result;
        }
      } catch (e) {
        throw new Error(
          `Supabase connector: invalid columnsOverride JSON: ${(e as Error).message}`
        );
      }
    }
    const cacheKey = `${target.mode}:${target.name}`;
    const cached = this.modelCache.get(cacheKey);
    if (cached) return cached;
    // Reuse rows the caller already fetched (getPage/getPageItemById) to infer
    // columns — avoids a second round-trip just to sample one row.
    if (sampleRows && sampleRows.length > 0) {
      const inferred = Object.keys(sampleRows[0]).map((name) => ({
        name,
        type: this.inferTypeFromValue(sampleRows[0][name]),
      }));
      this.modelCache.set(cacheKey, inferred);
      return inferred;
    }
    const discovered = await this.discoverColumns(target, context);
    this.modelCache.set(cacheKey, discovered);
    return discovered;
  }

  private async discoverColumns(
    target: ResolvedTarget,
    context: Connector.Dictionary
  ): Promise<ColumnSpec[]> {
    // RPC: PostgREST OpenAPI doesn't reliably expose function return types,
    // so go straight to row sampling — call the function with limit=1 plus
    // the user's rpcParams, derive columns from the first row.
    if (target.mode === 'rpc') {
      const rows = await this.fetchRows(
        target,
        { limit: '1', offset: '0' },
        context
      );
      if (!rows || rows.length === 0) {
        throw new Error(
          `Supabase connector: cannot infer columns for rpc "${target.name}" — ` +
            'the function returned no rows for the given rpcParams. ' +
            'Provide rpcParams that yield at least one row, or supply "columnsOverride".'
        );
      }
      return Object.keys(rows[0]).map((name) => ({
        name,
        type: this.inferTypeFromValue(rows[0][name]),
      }));
    }

    // View: sample one row and infer column types from its values. We do NOT
    // probe the PostgREST OpenAPI doc (GET /rest/v1/): Supabase locks that
    // root endpoint to service_role, so for the anon key it always 401s — a
    // misleading auth error on every cold load before the row-sampling
    // fallback succeeds. Row sampling works whenever RLS grants select, which
    // is already required for the connector to read the view at all. Use
    // "columnsOverride" if you need exact Postgres types instead of inference.
    const url = this.buildUrl(`/rest/v1/${encodeURIComponent(target.name)}`, {
      limit: '1',
    });
    const rows = await this.fetchJson<Record<string, unknown>[]>(url, 'GET');
    if (!rows || rows.length === 0) {
      throw new Error(
        `Supabase connector: cannot infer columns for "${target.name}" — ` +
          'the table/view returned no rows to sample. ' +
          'Provide "columnsOverride", or ensure the role can select at least one row.'
      );
    }
    return Object.keys(rows[0]).map((name) => ({
      name,
      type: this.inferTypeFromValue(rows[0][name]),
    }));
  }

  private inferTypeFromValue(value: unknown): string {
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

  private normaliseColumnType(type: unknown): string {
    const valid = ['singleLine', 'number', 'date', 'boolean', 'multiLine'];
    return typeof type === 'string' && valid.includes(type)
      ? type
      : 'singleLine';
  }

  private toDataItem(
    row: Record<string, unknown>,
    columns: ColumnSpec[],
    idColumn: string
  ): Data.DataItem {
    const idValue = row[idColumn];
    const item: Record<string, unknown> = {
      [ITEM_ID_PROPERTY]: idValue == null ? '' : String(idValue),
    };
    for (const col of columns) {
      item[col.name] = this.coerce(row[col.name]);
    }
    return item as Data.DataItem;
  }

  private coerce(value: unknown): string | number | boolean | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'boolean') return value;
    return JSON.stringify(value);
  }

  private buildUrl(path: string, params: Record<string, string>): string {
    const baseUrl = this.requireOption('SUPABASE_URL').replace(/\/+$/, '');
    const search = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    return `${baseUrl}${path}${search ? `?${search}` : ''}`;
  }

  private async fetchJson<T>(
    url: string,
    method: 'GET' | 'POST',
    body?: string
  ): Promise<T> {
    const headers: Connector.Dictionary = {
      Accept: 'application/json',
    };
    if (method === 'POST') {
      headers['Content-Type'] = 'application/json';
    }
    const init: Connector.ChiliRequestInit = { method, headers };
    if (body !== undefined) {
      init.body = body;
    }
    const response = await this.withTiming(
      () => this.runtime.fetch(url, init),
      `fetch ${method} ${this.describeUrl(url)}`
    );
    if (!response.ok) {
      const body =
        typeof response.text === 'string' && response.text.length > 0
          ? response.text.slice(0, 500)
          : '(no body)';
      throw new ConnectorHttpError(
        response.status,
        `Supabase connector: ${method} ${url} failed — ${response.status} ${response.statusText} — ${body}`
      );
    }
    const text = response.text;
    if (!text || text.trim() === '') {
      return [] as unknown as T;
    }
    try {
      return JSON.parse(text) as T;
    } catch (e) {
      throw new Error(
        `Supabase connector: invalid JSON response: ${(e as Error).message}`
      );
    }
  }

  /**
   * Reduces a full request URL to its PostgREST path + query for log labels,
   * e.g. "https://x.supabase.co/rest/v1/rpc/get_campaign_products?limit=5" ->
   * "/rest/v1/rpc/get_campaign_products?limit=5". Keeps secrets (host) out of
   * the log and makes it obvious which endpoint a timing refers to.
   */
  private describeUrl(url: string): string {
    const idx = url.indexOf('/rest/');
    return idx >= 0 ? url.slice(idx) : url;
  }

  /**
   * Runs an async function and, when the `logTiming` runtime option is enabled,
   * logs how long it took. Wrapped at two levels — the whole method ("getPage")
   * and the raw network round-trip nested inside it ("fetch GET /rest/v1/...").
   * Comparing the two pinpoints where a slow data binding spends its time:
   *   - method total ≈ fetch total  → the time is in the Supabase request
   *     itself (the DB query, the platform's outbound proxy, or the network).
   *   - method total ≫ fetch total  → the time is connector-side JS work
   *     (JSON parse, column inference, value coercion).
   * Logs go through `runtime.logError` so they surface in the CLI debugger
   * console and the platform connector logs. It is a zero-overhead no-op when
   * the flag is off, so it is safe to leave enabled-by-flag in a production
   * publish.
   */
  private async withTiming<T>(
    fn: () => Promise<T>,
    label: string
  ): Promise<T> {
    if (!this.isFlagOn('logTiming')) {
      return fn();
    }
    // performance.now() is monotonic and higher-resolution; fall back to
    // Date.now() if the sandbox doesn't expose it.
    const now =
      typeof performance !== 'undefined' &&
      typeof performance.now === 'function'
        ? () => performance.now()
        : () => Date.now();
    const start = now();
    try {
      const result = await fn();
      const seconds = ((now() - start) / 1000).toFixed(3);
      this.runtime.logError(`[Supabase][Timing] ${label} took ${seconds}s`);
      return result;
    } catch (error) {
      const seconds = ((now() - start) / 1000).toFixed(3);
      this.runtime.logError(
        `[Supabase][Timing] ${label} failed after ${seconds}s`
      );
      throw error;
    }
  }

  private requireOption(key: string): string {
    const value = this.runtime.options[key];
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(
        `Supabase connector: runtime option "${key}" is required.`
      );
    }
    return value;
  }
}
