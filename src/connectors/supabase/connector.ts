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

interface OpenApiProperty {
  type?: string;
  format?: string;
}

interface OpenApiDefinition {
  properties?: Record<string, OpenApiProperty>;
}

interface OpenApiDoc {
  definitions?: Record<string, OpenApiDefinition>;
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
  private openApiCache: OpenApiDoc | null = null;

  constructor(runtime: Connector.ConnectorRuntimeContext) {
    this.runtime = runtime;
  }

  async getPage(
    config: Data.BidirectionalPageConfig,
    context: Connector.Dictionary
  ): Promise<Data.BidirectionalDataPage> {
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
    this.applySorting(params, config.sorting);

    const rows = await this.fetchRows(target, params, context);
    const columns = await this.resolveColumns(target, context);

    return {
      data: rows.map((row) => this.toDataItem(row, columns, idColumn)),
      continuationToken:
        rows.length === config.limit ? String(offset + rows.length) : null,
      previousPageToken: offset > 0 ? String(offset) : null,
    };
  }

  async getModel(
    context: Connector.Dictionary
  ): Promise<Data.DataSourceVariableDataModel> {
    const target = this.readTarget(context);
    const columns = await this.resolveColumns(target, context);
    return {
      properties: [
        ...columns.map((c) => ({ name: c.name, type: c.type })),
        { name: ITEM_ID_PROPERTY, type: 'singleLine' },
      ],
      itemIdPropertyName: ITEM_ID_PROPERTY,
    };
  }

  async getPageItemById(
    id: string,
    _pageOptions: Data.PageItemOptions,
    context: Connector.Dictionary
  ): Promise<BidirectionalDataPageItem> {
    const target = this.readTarget(context);
    if (target.mode === 'rpc') {
      throw new Error(
        'Supabase connector: getPageItemById is not supported in rpc mode. Use a view to look up rows by id.'
      );
    }
    const idColumn = this.readIdColumn(context);
    const url = this.buildUrl(`/rest/v1/${encodeURIComponent(target.name)}`, {
      [idColumn]: `eq.${id}`,
      limit: '1',
    });
    const rows = await this.fetchJson<Record<string, unknown>[]>(url, 'GET');
    if (!rows || rows.length === 0) {
      throw new Error(
        `Supabase connector: row with ${idColumn}="${id}" not found in "${target.name}".`
      );
    }
    const columns = await this.resolveColumns(target, context);
    return {
      data: this.toDataItem(rows[0], columns, idColumn),
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
        name: 'queryMode',
        displayName: 'Query mode (view or rpc)',
        type: 'text',
        helpText:
          'Use "view" to read a table or view, or "rpc" to call a Postgres function. Defaults to "view".',
      },
      {
        name: 'targetName',
        displayName: 'Table / view / function name',
        type: 'text',
      },
      {
        name: 'idColumn',
        displayName: 'Primary key column',
        type: 'text',
        helpText:
          'Column used by getPageItemById to look up a single row. Defaults to "id". Ignored in rpc mode.',
      },
      {
        name: 'rpcParams',
        displayName: 'RPC parameters (JSON object)',
        type: 'text',
        helpText:
          'Only used in rpc mode. JSON object passed as the function arguments.',
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
    const rawMode = String(context['queryMode'] ?? 'view').toLowerCase();
    const mode: QueryMode = rawMode === 'rpc' ? 'rpc' : 'view';
    const name = String(context['targetName'] ?? '').trim();
    if (!name) {
      throw new Error(
        'Supabase connector: configuration option "targetName" is required.'
      );
    }
    return { mode, name };
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
    context: Connector.Dictionary
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

    // View: try the PostgREST OpenAPI doc first — gives proper Postgres
    // types. Supabase locks /rest/v1/ to service_role by default, so this
    // often 401s for anon callers; fall back to row sampling in that case.
    try {
      if (!this.openApiCache) {
        const url = this.buildUrl('/rest/v1/', {});
        const doc = await this.fetchJson<OpenApiDoc>(url, 'GET');
        this.openApiCache = doc ?? {};
      }
      const definition = this.openApiCache.definitions?.[target.name];
      if (definition && definition.properties) {
        return Object.entries(definition.properties).map(([name, prop]) => ({
          name,
          type: this.openApiToColumnType(prop),
        }));
      }
    } catch (_e) {
      // OpenAPI not accessible — drop through to row sampling.
    }

    const url = this.buildUrl(`/rest/v1/${encodeURIComponent(target.name)}`, {
      limit: '1',
    });
    const rows = await this.fetchJson<Record<string, unknown>[]>(url, 'GET');
    if (!rows || rows.length === 0) {
      throw new Error(
        `Supabase connector: cannot infer columns for "${target.name}" — ` +
          'OpenAPI not accessible and table returned no rows. ' +
          'Provide "columnsOverride", or grant select on /rest/v1/ to your role.'
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

  private openApiToColumnType(prop: OpenApiProperty): string {
    const type = (prop.type ?? '').toLowerCase();
    const format = (prop.format ?? '').toLowerCase();
    if (type === 'integer' || type === 'number') return 'number';
    if (type === 'boolean') return 'boolean';
    if (type === 'string') {
      if (
        format === 'date' ||
        format === 'date-time' ||
        format.startsWith('timestamp')
      ) {
        return 'date';
      }
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
    const response = await this.runtime.fetch(url, init);
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
