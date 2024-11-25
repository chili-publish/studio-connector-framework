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

interface Spreadsheet {
  sheets: Array<{ properties: { sheetId: string; title: string } }>;
}

class RangeHelper {
  static buildHeaderRange(sheetName: string | null) {
    return RangeHelper.buildRange(sheetName, 1, 1);
  }

  static buildFirstPageRange(sheetName: string | null, limit: number) {
    // starts from 2 since exclude header row that has index '1'
    return RangeHelper.buildRange(sheetName, 2, limit > 1 ? 1 + limit : 2);
  }

  static buildNextPageRange(currentRange: string, limit: number) {
    const [sheetName, _, lastRow] = RangeHelper.extractFromRange(currentRange);
    if (Number.isNaN(lastRow)) {
      throw new Error(`Incorrect format of the cells range "${currentRange}"`);
    }
    return RangeHelper.buildRange(sheetName, lastRow + 1, lastRow + limit);
  }

  private static buildRange(
    sheetName: string | null,
    start: number,
    end: number
  ) {
    return sheetName ? `${sheetName}!A${start}:Z${end}` : `A${start}:Z${end}`;
  }

  private static extractFromRange(
    range: string
  ): [string | null, number, number] {
    const splitted = range.split('!');

    const sheetName = splitted.length === 1 ? null : splitted[0]; // when we request data without sheetName
    const cellsQuery = splitted.length === 1 ? splitted[0] : splitted[1];

    const splittedCells = cellsQuery.split(':');
    return [
      sheetName,
      Number(splittedCells[0].replace('A', '')),
      Number(splittedCells[1].replace('Z', '')),
    ];
  }
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
    const { spreadsheetId, sheetId } =
      this.extractSheetIdentityFromContext(context);

    if (config.limit < 1) {
      return {
        continuationToken: null,
        data: [],
      };
    }
    const sheetName = await this.fetchSheetName(spreadsheetId, sheetId);

    let cellsRange =
      config.continuationToken ||
      RangeHelper.buildFirstPageRange(sheetName, config.limit);

    // Request two ranges of the cells
    // 1. Header range to properly map to DataItem
    // 2. Next batch of values
    const res = await this.runtime.fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=${RangeHelper.buildHeaderRange(
        sheetName
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
      continuationToken: this.isNextPageAvailable(config.limit, data.length)
        ? RangeHelper.buildNextPageRange(cellsRange, config.limit)
        : null,
      data,
    };
  }

  async getModel(context: Connector.Dictionary): Promise<Data.DataModel> {
    const { spreadsheetId, sheetId } =
      this.extractSheetIdentityFromContext(context);

    const sheetName = await this.fetchSheetName(spreadsheetId, sheetId);

    const res = await this.runtime.fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${RangeHelper.buildHeaderRange(
        sheetName
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
        name: 'spreadsheetURL',
        displayName: 'Spreadsheet URL',
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

  private extractSheetIdentityFromContext(context: Connector.Dictionary): {
    spreadsheetId: string;
    sheetId: string | null;
  } {
    const spreadsheetURL = context['spreadsheetURL'];

    if (!spreadsheetURL || typeof spreadsheetURL !== 'string') {
      throw new Error(
        `Google Sheet: The required configuration option "spreadsheetURL" is not provided or has a wrong type.
          Expected "string" URL. Actual is "${spreadsheetURL}"`
      );
    }
    const spreadsheetIdMatch = spreadsheetURL
      .trim()
      .match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const sheetIdMatch = spreadsheetURL.trim().match(/gid=(\d+)/);

    const spreadsheetId = spreadsheetIdMatch ? spreadsheetIdMatch[1] : null;
    const sheetId = sheetIdMatch ? sheetIdMatch[1] : null;

    // URL must contain at least spreadsheetId. If sheetId is not defined we treat it as first sheet to work with
    if (!spreadsheetId) {
      throw new Error(
        `Google Sheet: The provided Spreadsheet URL "${spreadsheetURL}"  is not correct. "spreadsheetId" can\'t be identified.`
      );
    }

    return { spreadsheetId, sheetId };
  }

  private async fetchSheetName(
    spreadsheetId: string,
    sheetId: string | null
  ): Promise<string | null> {
    if (!sheetId) {
      return null;
    }
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;

    const res = await this.runtime.fetch(url, { method: 'GET' });
    if (!res.ok)
      throw new ConnectorHttpError(
        res.status,
        `Google Sheet: GetSheetName failed for "${spreadsheetId}" and "${sheetId}". Result is ${res.status} - ${res.statusText}`
      );

    const data: Spreadsheet = JSON.parse(res.text);

    // Find the sheet that matches the sheetId
    const sheet = data.sheets.find(
      (sheet) => sheet.properties.sheetId.toString() === sheetId
    );
    if (!sheet) {
      throw new Error(
        `Google Sheet: The provided sheetId "${sheetId}" doesn't exist in the spreadsheet document`
      );
    }
    return sheet.properties.title;
  }

  private isNextPageAvailable(requestedSize: number, resultItems: number) {
    return requestedSize === resultItems;
  }
}
