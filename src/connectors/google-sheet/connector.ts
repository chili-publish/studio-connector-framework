import { Connector, Data } from '@chili-publish/studio-connectors';

/**
 * Limitations:
 *
 * 1. Columns only from A to Z
 * 2. First row is always header
 */

interface BaseSheetCells {
  formattedValue: string;
  effectiveFormat?: {
    numberFormat: { type: string };
  };
}
interface NumberCell extends BaseSheetCells {
  effectiveValue: { numberValue: number };
}
interface BooleanCell extends BaseSheetCells {
  effectiveValue: { boolValue: boolean };
}
interface StringCell extends BaseSheetCells {
  effectiveValue: { stringValue: string };
}

type CellData = StringCell | NumberCell | BooleanCell;

interface SheetCells {
  range: string;
  values: CellData[] | undefined;
}

interface Spreadsheet {
  sheets: Array<{ properties: { sheetId: string; title: string } }>;
}

interface ApiError {
  error: {
    message: string;
  };
}

class RangeHelper {
  static buildHeaderRange(
    sheetName: string | null,
    start: number,
    end: number
  ) {
    return RangeHelper.buildRange(sheetName, start, end);
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
  sheetCells: SheetCells[]
): Array<Data.DataItem> {
  return sheetCells.map((row) => {
    return row.values.reduce((item, cell, index) => {
      if (
        cell.effectiveFormat?.numberFormat.type === 'NUMBER' &&
        'numberValue' in cell.effectiveValue
      )
        item[tableHeader[index].formattedValue] =
          cell.effectiveValue.numberValue;
      else if (
        cell.effectiveFormat?.numberFormat.type === 'DATE' ||
        cell.effectiveFormat?.numberFormat.type === 'DATE_TIME'
      ) {
        item[tableHeader[index].formattedValue] = new Date(cell.formattedValue);
      } else if (
        'boolValue' in cell.effectiveValue &&
        cell.effectiveValue.boolValue !== undefined
      ) {
        item[tableHeader[index].formattedValue] = cell.effectiveValue.boolValue;
      } else if ('stringValue' in cell.effectiveValue) {
        item[tableHeader[index].formattedValue] =
          cell.effectiveValue.stringValue;
      }
      return item;
    }, {} as Data.DataItem);
  });
}

const fieldsMask = `sheets.properties(sheetId,title),sheets.data.rowData.values(formattedValue,effectiveFormat.numberFormat.type,effectiveValue)`;
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
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/?fields=${fieldsMask}&ranges=${RangeHelper.buildHeaderRange(
        sheetName,
        1,
        1
      )}&ranges=${cellsRange}`,
      {
        method: 'GET',
      }
    );

    // We handle 400 in a specific way since it might be related to the requesting the last "empty" batch of records
    // during batch output generation. In this case we need to complete request as success with empty return data
    if (!res.ok && res.status === 400) {
      try {
        const { error }: ApiError = JSON.parse(res.text);
        this.runtime.logError(
          `Google Sheet: GetPage failed ${res.status} - ${error.message}`
        );
        return {
          continuationToken: null,
          data: [],
        };
      } catch (err) {
        throw new ConnectorHttpError(
          res.status,
          `Google Sheet: GetPage failed ${res.status} - ${res.statusText}`
        );
      }
    }

    if (!res.ok) {
      throw new ConnectorHttpError(
        res.status,
        `Google Sheet: GetPage failed ${res.status} - ${res.statusText}`
      );
    }
    const sheetData = JSON.parse(res.text).sheets[0].data;

    const headerRow = sheetData[0].rowData[0].values;
    const values = sheetData[1].rowData;
    // When we request for range that contains only empty rows, "values" will be undefined => we return empty data
    const data = values ? convertCellsToDataItems(headerRow, values) : [];

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
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/?includeGridData=true&ranges=${RangeHelper.buildHeaderRange(
        sheetName,
        1,
        1
      )}&ranges=${RangeHelper.buildHeaderRange(
        sheetName,
        2,
        2
      )}&fields=${fieldsMask}`,
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

    const { values }: { values: { formattedValue: string }[] } = JSON.parse(
      res.text
    ).sheets[0].data[0].rowData[0];

    const { values: dataValues }: SheetCells = JSON.parse(res.text).sheets[0]
      .data[1].rowData[0];

    const headerRow = values;

    const getType = (column) => {
      if (column?.effectiveFormat?.numberFormat.type === 'NUMBER')
        return 'number';
      if (
        column?.effectiveFormat?.numberFormat.type === 'DATE' ||
        column?.effectiveFormat?.numberFormat.type === 'DATE_TIME'
      )
        return 'date';

      if (column?.effectiveValue?.boolValue !== undefined) return 'boolean';
      return 'singleLine';
    };
    return {
      properties: headerRow.map((column, idx) => {
        return {
          type: getType(dataValues[idx]),
          name: column.formattedValue,
        };
      }),
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
