import { Connector, Data } from '@chili-publish/studio-connectors';

/**
 * Limitations:
 *
 * 1. Columns only from A to Z
 * 2. First row is always header
 */

interface SheetCells {
  range: string;
  values: Array<Array<string>>;
}

interface SheetRanges {
  valueRanges: Array<SheetCells>;
}

class RangeHelper {
  static buildHeaderRange(sheetId: string) {
    return RangeHelper.buildRange(sheetId, 1, 1);
  }

  static buildFirstPageRange(sheetId: string, limit: number) {
    // starts from 2 since exclude header row that has index '1'
    return RangeHelper.buildRange(sheetId, 2, limit > 1 ? 1 + limit : 2);
  }

  static buildNextPageRange(currentRange: string, limit: number) {
    const [sheetId, _, lastRow] = RangeHelper.extractFromRange(currentRange);
    if (Number.isNaN(lastRow)) {
      throw new Error(`Incorrect format of the cells range "${currentRange}"`);
    }
    return RangeHelper.buildRange(sheetId, lastRow + 1, lastRow + limit);
  }

  private static buildRange(
    sheetId: string | undefined,
    start: number,
    end: number
  ) {
    const sheetName = sheetId ? `'${sheetId}'` : '';
    return sheetName ? `${sheetName}!A${start}:Z${end}` : `A${start}:Z${end}`;
  }

  private static extractFromRange(
    range: string
  ): [string | undefined, number, number] {
    const splitted = range.split('!');

    const sheetId = splitted.length === 1 ? undefined : splitted[0]; // when we request data without sheetId
    const cellsQuery = splitted.length === 1 ? splitted[0] : splitted[1];

    const splittedCells = cellsQuery.split(':');
    return [
      sheetId,
      Number(splittedCells[0].replace('A', '')),
      Number(splittedCells[1].replace('Z', '')),
    ];
  }
}

// When using table view for spreadsheet it returns only existing cells of the table
// So in case if it returns less then we requested, it means we've reached the end of the spreadsheet
function isNextPageAvailable(requestedRange: string, resultRange: string);
// For the default spreadsheet view we should calculate it based on returned items and limit request
function isNextPageAvailable(requestedSize: number, resultSize: number);
function isNextPageAvailable(
  requested: string | number,
  result: string | number
) {
  return requested === result;
}

function convertCellsToDataItems(
  tableHeader: SheetCells['values'][0],
  sheetCells: SheetCells['values']
): Array<Data.DataItem> {
  return sheetCells.map((row) =>
    row.reduce((item, cell, index) => {
      item[tableHeader[index]] = cell;
      return item;
    }, {} as Data.DataItem)
  );
}

export default class GoogleSheetConnector implements Data.DataConnector {
  private runtime: Connector.ConnectorRuntimeContext;

  constructor(runtime: Connector.ConnectorRuntimeContext) {
    this.runtime = runtime;
  }

  async getPage(
    config: Data.PageConfig,
    context: Connector.Dictionary
  ): Promise<Data.DataPage> {
    const spreadsheetId = context['spreadsheetId'] as string;
    if (!spreadsheetId) {
      throw new Error(
        'Google Sheet: The required configuration option "spreadsheetId" is not defined'
      );
    }

    if (config.limit < 1) {
      return {
        continuationToken: null,
        data: [],
      };
    }
    const sheetId = context['sheetId'] as string;

    let cellsRange =
      config.continuationToken ||
      RangeHelper.buildFirstPageRange(sheetId, config.limit);

    // Request two ranges of the cells
    // 1. Header range to properly map to DataItem
    // 2. Next batch of values
    const res = await this.runtime.fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=${RangeHelper.buildHeaderRange(
        sheetId
      )}&ranges=${cellsRange}`,
      {
        method: 'GET',
      }
    );

    if (!res.ok) {
      throw new ConnectorHttpError(
        res.status,
        `Google Sheet: GetPage failed ${res.status} - ${res.statusText}`
      );
    }
    const { valueRanges }: SheetRanges = JSON.parse(res.text);

    const headerRow = valueRanges[0].values[0];
    const { values, range } = valueRanges[1];

    const data = convertCellsToDataItems(headerRow, values);

    return {
      continuationToken:
        isNextPageAvailable(cellsRange, range) ||
        isNextPageAvailable(config.limit, data.length)
          ? RangeHelper.buildNextPageRange(cellsRange, config.limit)
          : null,
      data,
    };
  }

  async getModel(context: Connector.Dictionary): Promise<Data.DataModel> {
    const spreadsheetId = context['spreadsheetId'] as string;
    if (!spreadsheetId) {
      throw new Error(
        'Google Sheet: The required configuration option "spreadsheetId" is not defined'
      );
    }
    const sheetId = context['sheetId'] as string;
    const res = await this.runtime.fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${RangeHelper.buildHeaderRange(
        sheetId
      )}`,
      {
        method: 'GET',
      }
    );

    if (!res.ok) {
      throw new ConnectorHttpError(
        res.status,
        `Google Sheet: GetModel failed ${res.status} - ${res.statusText}`
      );
    }

    const { values }: SheetCells = JSON.parse(res.text);

    const headerRow = values[0];

    // TODO: To define proper type we need in addition to header row also request first row of the data
    // and extract all information from there
    // The all call should be replaced with "spreadsheets.get" with grid data for the range of header and first data row
    // To read the format, refers to "effectiveFormat"  or "effectiveValue" fields:
    // - "effectiveFormat.numberFormat.type" = "NUMBER" - states for "number"
    // - "effectiveFormat.numberFormat.type" = "DATE" or "DATE_TIME" - states for "date"
    // - "effectiveValue.boolValue" != undefined - states for "bool"
    // - Others - states for "singleLine" ("MultiLine")
    return {
      properties: headerRow.map((column) => ({
        type: 'singleLine',
        name: column,
      })),
    };
  }

  getConfigurationOptions(): Connector.ConnectorConfigValue[] | null {
    return [
      {
        type: 'text',
        name: 'spreadsheetId',
        displayName: 'Google spreadsheet ID',
      },
      {
        type: 'text',
        name: 'sheetId',
        displayName: 'Sheet name inside the Google Spreadsheet document',
      },
    ];
  }

  getCapabilities(): Data.DataConnectorCapabilities {
    return {
      filtering: false,
      sorting: false,
      model: true,
    };
  }
}
