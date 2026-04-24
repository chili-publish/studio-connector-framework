import {
  Connector,
  Data,
  DataFilter,
  BidirectionalDataPageItem,
} from '@chili-publish/studio-connectors';

// The property name injected on every row as the unique item identifier.
const ITEM_ID_PROPERTY = '__id__' as const;

type ConnectorCellType = 'singleLine' | 'number' | 'date' | 'boolean';

interface ParsedRow {
  originalIndex: number;
  values: unknown[];
}

interface ParsedSheet {
  headers: string[];
  types: ConnectorCellType[];
  rows: ParsedRow[];
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────
// Handles:
//   • Comma-separated and semicolon-separated files
//   • Quoted fields (fields containing commas, semicolons or line breaks)
//   • UTF-8 BOM added by Excel's "CSV UTF-8" export
//   • Windows (CRLF) and Unix (LF) line endings
//   • Type inference: numbers, booleans, ISO dates → singleLine fallback

class CsvParser {
  parse(raw: string): ParsedSheet {
    // Strip UTF-8 BOM that Excel prepends to CSV UTF-8 exports.
    const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;

    const allRows = this.tokenize(text);

    // Drop fully empty rows (trailing newline, blank lines).
    const nonEmpty = allRows.filter((row) => row.some((v) => v.trim().length > 0));

    if (nonEmpty.length < 2) {
      throw new Error(
        'CSV connector: file must have at least a header row and one data row.'
      );
    }

    const headers = nonEmpty[0].map((h, i) =>
      h.trim().length > 0 ? h.trim() : `Column${i + 1}`
    );

    const dataRows = nonEmpty.slice(1);

    // Infer column types by sampling all non-empty values per column.
    // If any cell contradicts the type inferred from the first sample, fall
    // back to 'singleLine' so heterogeneous columns are never misclassified.
    const types: ConnectorCellType[] = headers.map((_, col) => {
      const samples = dataRows
        .map((r) => (r[col] ?? '').trim())
        .filter((v) => v.length > 0);
      if (samples.length === 0) return 'singleLine';
      const candidate = this.inferType(samples[0]);
      if (candidate === 'singleLine') return 'singleLine';
      const consistent = samples.every((s) => this.inferType(s) === candidate);
      return consistent ? candidate : 'singleLine';
    });

    const rows: ParsedRow[] = dataRows
      .map((cells, i) => ({
        originalIndex: i,
        values: headers.map((_, col) =>
          this.coerce((cells[col] ?? '').trim(), types[col])
        ),
      }))
      .filter((row) => row.values.some((v) => v !== null && v !== ''));

    return { headers, types, rows };
  }

  // RFC 4180-compliant tokeniser — returns a 2-D array of raw cell strings.
  private tokenize(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let inQuotes = false;
    let i = 0;

    const delimiter = this.detectDelimiter(text);

    while (i < text.length) {
      const ch   = text[i];
      const next = text[i + 1];

      if (inQuotes) {
        if (ch === '"' && next === '"') {
          // Escaped double-quote inside a quoted field ("").
          cell += '"';
          i += 2;
        } else if (ch === '"') {
          inQuotes = false;
          i++;
        } else {
          cell += ch;
          i++;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
          i++;
        } else if (ch === delimiter) {
          row.push(cell);
          cell = '';
          i++;
        } else if (ch === '\r' && next === '\n') {
          row.push(cell);
          rows.push(row);
          row = [];
          cell = '';
          i += 2;
        } else if (ch === '\n' || ch === '\r') {
          row.push(cell);
          rows.push(row);
          row = [];
          cell = '';
          i++;
        } else {
          cell += ch;
          i++;
        }
      }
    }

    // Flush the last cell / row (file may not end with a newline).
    if (cell.length > 0 || row.length > 0) {
      row.push(cell);
      rows.push(row);
    }

    return rows;
  }

  // Detect delimiter by counting commas vs semicolons in the first line.
  private detectDelimiter(text: string): string {
    const eol       = text.indexOf('\n');
    const firstLine = eol === -1 ? text : text.slice(0, eol);
    const commas    = (firstLine.match(/,/g) ?? []).length;
    const semis     = (firstLine.match(/;/g) ?? []).length;
    return semis > commas ? ';' : ',';
  }

  private inferType(sample: string): ConnectorCellType {
    if (sample === '') return 'singleLine';
    if (sample.toLowerCase() === 'true' || sample.toLowerCase() === 'false') return 'boolean';
    if (
      sample.length > 0 &&
      !/^[+0]/.test(sample) &&
      Number.isFinite(Number(sample))
    ) return 'number';
    if (/^\d{4}-\d{2}-\d{2}(T[\d:.Z+-]+)?$/.test(sample) && !Number.isNaN(new Date(sample).getTime())) return 'date';
    return 'singleLine';
  }

  private coerce(value: string, type: ConnectorCellType): unknown {
    if (value === '') return null;
    switch (type) {
      case 'number':  return Number.isFinite(Number(value)) ? Number(value) : value;
      case 'boolean': return value.toLowerCase() === 'true';
      case 'date':    return value;
      default:        return value;
    }
  }
}

// ─── Connector ────────────────────────────────────────────────────────────────

export default class CsvConnector
  implements Data.DataConnector, Data.DataSourceVariableCapability
{
  private runtime: Connector.ConnectorRuntimeContext;
  private parser = new CsvParser();
  private cache: { url: string; sheet: ParsedSheet } | null = null;

  constructor(runtime: Connector.ConnectorRuntimeContext) {
    this.runtime = runtime;
  }

  // ─── Public connector methods ─────────────────────────────────────────────

  async getPage(
    config: Data.BidirectionalPageConfig,
    context: Connector.Dictionary
  ): Promise<Data.BidirectionalDataPage> {
    if (config.limit < 1) {
      return { previousPageToken: null, continuationToken: null, data: [] };
    }

    const { headers, rows } = await this.downloadAndParse(context);
    const filtered = this.applyFilters(rows, headers, config.filters);

    let startIndex = 0;
    if (config.continuationToken) {
      const parsed = parseInt(config.continuationToken, 10);
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(`CSV connector: invalid continuation token "${config.continuationToken}".`);
      }
      startIndex = parsed;
    } else if (config.previousPageToken) {
      const tokenStart = parseInt(config.previousPageToken, 10);
      if (!Number.isFinite(tokenStart) || tokenStart < 0) {
        throw new Error(`CSV connector: invalid previous page token "${config.previousPageToken}".`);
      }
      startIndex = Math.max(0, tokenStart - config.limit);
    }

    const pageRows = filtered.slice(startIndex, startIndex + config.limit);
    const data = pageRows.map((row) => this.toDataItem(row, headers));
    const endIndex = startIndex + pageRows.length;

    return {
      data,
      continuationToken: endIndex < filtered.length ? String(endIndex) : null,
      previousPageToken: startIndex > 0 ? String(startIndex) : null,
    };
  }

  async getModel(
    context: Connector.Dictionary
  ): Promise<Data.DataSourceVariableDataModel> {
    const { headers, types } = await this.downloadAndParse(context);

    return {
      properties: headers.map((name, i) => ({
        name,
        type: types[i] as Data.DataModelProperty['type'],
      })),
      itemIdPropertyName: ITEM_ID_PROPERTY,
    };
  }

  async getPageItemById(
    id: string,
    pageOptions: Data.PageItemOptions,
    context: Connector.Dictionary
  ): Promise<BidirectionalDataPageItem> {
    const originalIndex = parseInt(id, 10);
    if (isNaN(originalIndex) || originalIndex < 0) {
      throw new Error(`CSV connector: invalid item id "${id}".`);
    }

    const { headers, rows } = await this.downloadAndParse(context);
    const filteredIndex = rows.findIndex((r) => r.originalIndex === originalIndex);
    if (filteredIndex === -1) {
      throw new Error(`CSV connector: row with id "${id}" not found.`);
    }

    const limit = Math.max(1, pageOptions.limit);
    const row = rows[filteredIndex];

    const currentPageStart = Math.floor(filteredIndex / limit) * limit;

    return {
      data: this.toDataItem(row, headers),
      continuationToken:
        filteredIndex + 1 < rows.length ? String(filteredIndex + 1) : null,
      previousPageToken: currentPageStart > 0 ? String(currentPageStart) : null,
    };
  }

  getCapabilities(): Data.DataConnectorCapabilities {
    return {
      filtering: true,
      sorting: false,
      model: true,
      dataSourceVariable: true,
    };
  }

  getConfigurationOptions(): Connector.ConnectorConfigValue[] | null {
    return [
      {
        name: 'csvUrl',
        displayName: 'CSV File URL',
        type: 'text',
      },
    ];
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async downloadAndParse(
    context: Connector.Dictionary
  ): Promise<ParsedSheet> {
    const url = context['csvUrl'] as string | undefined;
    if (!url || url.trim().length === 0) {
      throw new Error('CSV connector: configuration option "csvUrl" is required.');
    }

    const normalisedUrl = url.trim();

    if (this.cache?.url === normalisedUrl) {
      return this.cache.sheet;
    }

    const response = await this.runtime.fetch(normalisedUrl, { method: 'GET' });
    if (!response.ok) {
      throw new ConnectorHttpError(
        response.status,
        `CSV connector: failed to fetch — ${response.status} ${response.statusText}`
      );
    }

    // The GraFx Studio runtime only populates response.text when the response
    // is served with Content-Type: application/json (or any type containing
    // "json"). Ensure your CSV file is hosted at a public URL and served with
    // Content-Type: application/json.
    const text = response.text as string | undefined;
    if (!text || text.trim().length === 0) {
      throw new Error(
        'CSV connector: no text content received. ' +
        'Ensure the file is served with Content-Type: application/json.'
      );
    }

    const sheet = this.parser.parse(text);
    this.cache = { url: normalisedUrl, sheet };
    return sheet;
  }

  private applyFilters(
    rows: ParsedRow[],
    headers: string[],
    filters: DataFilter[] | null | undefined
  ): ParsedRow[] {
    if (!filters || filters.length === 0) return rows;

    const normalised = filters
      .filter((f): f is DataFilter => f !== null && typeof f.property === 'string');

    if (normalised.length === 0) return rows;

    return rows.filter((row) =>
      normalised.every((filter) => {
        const colIndex = headers.indexOf(filter.property);
        if (colIndex === -1) return true;
        const val = row.values[colIndex];
        if (val === null || val === undefined) return false;
        const cellStr = String(val).toLowerCase();
        const needle  = String(filter.value).toLowerCase();
        return filter.type === 'exact' ? cellStr === needle : cellStr.includes(needle);
      })
    );
  }

  private toDataItem(row: ParsedRow, headers: string[]): Data.DataItem {
    const item: Record<string, unknown> = {
      [ITEM_ID_PROPERTY]: String(row.originalIndex),
    };
    headers.forEach((header, i) => {
      item[header] = row.values[i] ?? null;
    });
    return item as Data.DataItem;
  }
}
