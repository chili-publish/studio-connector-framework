import { Connector, Data } from '@chili-publish/studio-connectors';

interface BaseSheetCells {
  formattedValue?: string;
}
interface NumberCell extends BaseSheetCells {
  effectiveValue?: { numberValue: number };
  effectiveFormat: {
    numberFormat: { type: 'NUMBER' };
  };
}

interface DateCell extends BaseSheetCells {
  effectiveValue?: {
    numberValue: number;
  };
  effectiveFormat: {
    numberFormat: { type: 'DATE' | 'DATE_TIME' };
  };
}

interface BooleanCell extends BaseSheetCells {
  effectiveValue: { boolValue: boolean };
}

type PlainTextCell = BaseSheetCells;

type CellData = NumberCell | BooleanCell | DateCell | PlainTextCell;

interface Row<C = CellData> {
  values: Array<C>;
}

// Whe you insert empty row in spreadhsheet document and there is no formatting at any cell of this row it will have following type
type EmptyRowWithoutFormatting = Omit<Row, 'values'> & { values: undefined };

interface Spreadsheet {
  sheets: Array<{
    properties: { sheetId: string; title: string };
    data: [{ rowData?: [Row<Required<CellData>>] }, { rowData?: Array<Row> }];
  }>;
}

interface ApiError {
  error: {
    message: string;
  };
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

  public static buildRange(
    sheetName: string | null,
    start: number,
    end: number
  ) {
    return sheetName ? `${sheetName}!${start}:${end}` : `${start}:${end}`;
  }

  private static extractFromRange(
    range: string
  ): [string | null, number, number] {
    const splitted = range.split('!');

    const sheetName = splitted.length === 1 ? null : splitted[0]; // when we request data without sheetName
    const cellsQuery = splitted.length === 1 ? splitted[0] : splitted[1];

    const splittedCells = cellsQuery.split(':');
    return [sheetName, Number(splittedCells[0]), Number(splittedCells[1])];
  }
}

type TypedNumberCell = {
  type: 'number';
  cell: NumberCell;
};

type TypedDateCell = {
  type: 'date';
  cell: DateCell;
};

type TypedPlainTextCell = {
  type: 'singleLine';
  cell: PlainTextCell;
};

type TypedBooleanCell = {
  type: 'boolean';
  cell: BooleanCell;
};

class Converter {
  static toDataItems(
    tableHeader: Row<Required<CellData>>,
    tableBody: Array<Row>
  ): Array<Data.DataItem> {
    const tableHeaderValues = tableHeader.values;
    return (
      tableBody
        .map(
          (row) =>
            this.normalizeRow(row, tableHeaderValues.length)?.values.reduce(
              (item, tableCell, index) => {
                const { type, cell } = Converter.toTypedCell(tableCell);

                switch (type) {
                  case 'number':
                    item[tableHeaderValues[index].formattedValue] =
                      cell.effectiveValue?.numberValue ?? null;
                    break;
                  case 'date':
                    item[tableHeaderValues[index].formattedValue] =
                      this.convertToDate(cell.effectiveValue?.numberValue);
                    break;
                  case 'boolean':
                    item[tableHeaderValues[index].formattedValue] =
                      cell.effectiveValue.boolValue;
                    break;
                  case 'singleLine':
                    item[tableHeaderValues[index].formattedValue] =
                      cell.formattedValue ?? null;
                    break;
                }
                return item;
              },
              {} as Data.DataItem
            ) ?? null
        )
        // Filter out empty rows
        .filter((d) => d !== null)
    );
  }

  static toDataModelProperties(
    headerRow: Row<Required<CellData>>,
    bodyRows: Array<Row>
  ): Array<Data.DataModelProperty> {
    if (!bodyRows.length) {
      throw new Error(
        'Model can not be generated. To execute the operation your sheet should have the row with data in addition to the header row'
      );
    }
    const normalizedBodyRow = Converter.normalizeRow(
      bodyRows[0],
      headerRow.values.length
    );
    if (!normalizedBodyRow) {
      throw new Error(
        'Model can not be generated. To execute the operation your sheet should have the row with data in addition to the header row'
      );
    }
    const { values } = normalizedBodyRow;
    return headerRow.values.map((column, idx) => {
      return {
        type: Converter.toTypedCell(values[idx]).type,
        name: column.formattedValue,
      };
    });
  }

  /**
   * Inspects a Google Sheets cell and determines its semantic type—number, date, boolean, or single line of text—
   * based on the provided cell's formatting and effective value. This is used to map Google Sheets' flexible cell
   * data model to strongly typed connector model data.
   *
   * @param cell The cell data object returned by the Google Sheets API, possibly containing formatting and value information.
   */
  private static toTypedCell(
    cell: CellData
  ): TypedNumberCell | TypedDateCell | TypedPlainTextCell | TypedBooleanCell {
    if (
      'effectiveFormat' in cell &&
      'numberFormat' in cell.effectiveFormat &&
      cell.effectiveFormat.numberFormat.type === 'NUMBER'
    ) {
      return {
        type: 'number',
        cell: cell as NumberCell,
      };
    }

    if (
      'effectiveFormat' in cell &&
      'numberFormat' in cell.effectiveFormat &&
      (cell.effectiveFormat.numberFormat.type === 'DATE' ||
        cell.effectiveFormat.numberFormat.type === 'DATE_TIME')
    ) {
      return {
        type: 'date',
        cell: cell as DateCell,
      };
    }

    if (
      'effectiveValue' in cell &&
      cell.effectiveValue &&
      'boolValue' in cell.effectiveValue
    ) {
      return {
        type: 'boolean',
        cell: cell as BooleanCell,
      };
    }
    return {
      type: 'singleLine',
      cell: cell,
    };
  }

  /**
   * Depends on whether row contains custom formatting or not Google Sheets API return data in different way
   * This function is reponsible to handle all such use cases and return Row always in regular form as well as handling empty rows use case
   *
   * @param row
   * @param columnsLength
   * @returns
   */
  private static normalizeRow(
    row: Row | EmptyRowWithoutFormatting,
    columnsLength: number
  ): Row | null {
    if (!row.values) {
      return null;
    }
    const emptyRow = row.values.every((c) => !c.formattedValue);
    if (emptyRow) {
      return null;
    }
    if (row.values.length === columnsLength) {
      return row;
    }
    return {
      values: [
        ...row.values,
        ...new Array(columnsLength - row.values.length).fill({}),
      ],
    };
  }

  /**
   * The number value that Google sheets represent as date refers to serial number of internal date system
   * This function takes this into account and transofrm to regular date
   * @param serialNumber Internal date representation
   */
  private static convertToDate(serialNumber?: number) {
    if (!serialNumber) {
      return null;
    }
    // Google Sheets epoch date is December 30, 1899
    const epoch = new Date(Date.UTC(1899, 11, 30)); // UTC to avoid timezone issues
    const date = new Date(epoch.getTime() + serialNumber * 24 * 60 * 60 * 1000); // Add days in milliseconds return
    return date;
  }
}

const FIELDS_MASK = `sheets.properties(sheetId,title),sheets.data.rowData.values(formattedValue,effectiveFormat.numberFormat.type,effectiveValue)`;
export default class GoogleSheetConnector implements Data.DataConnector {
  private runtime: Connector.ConnectorRuntimeContext;
  constructor(runtime: Connector.ConnectorRuntimeContext) {
    this.runtime = runtime;
  }

  async getPage(
    config: Data.PageConfig,
    context: Connector.Dictionary
  ): Promise<Data.DataPage> {
    return this.withTiming(async () => {
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
      const res = await this.withTiming(
        () =>
          this.runtime.fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/?fields=${FIELDS_MASK}&ranges=${encodeURIComponent(
              RangeHelper.buildHeaderRange(sheetName)
            )}&ranges=${encodeURIComponent(cellsRange)}`,
            {
              method: 'GET',
            }
          ),
        'fetch:getPage'
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

      const [headerRow, bodyRows] = this.parseResponse(res, 'GetPage');

      const data = Converter.toDataItems(headerRow, bodyRows);

      return {
        continuationToken: this.isNextPageAvailable(config.limit, data.length)
          ? RangeHelper.buildNextPageRange(cellsRange, config.limit)
          : null,
        data,
      };
    }, 'getPage');
  }

  async getModel(context: Connector.Dictionary): Promise<Data.DataModel> {
    return this.withTiming(async () => {
      const { spreadsheetId, sheetId } =
        this.extractSheetIdentityFromContext(context);

      const sheetName = await this.fetchSheetName(spreadsheetId, sheetId);
      const res = await this.withTiming(
        () =>
          this.runtime.fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/?includeGridData=true&ranges=${encodeURIComponent(
              RangeHelper.buildHeaderRange(sheetName)
            )}&ranges=${encodeURIComponent(
              RangeHelper.buildRange(sheetName, 2, 2)
            )}&fields=${FIELDS_MASK}`,
            {
              method: 'GET',
            }
          ),
        'fetch:getModel'
      );

      const [headerRow, bodyRows] = this.parseResponse(res, 'GetModel');

      const properties = Converter.toDataModelProperties(headerRow, bodyRows);

      return {
        properties,
      };
    }, 'getModel');
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

  /**
   * Parse response and extract header and body data for the further processing
   * @param response
   * @returns [headerRow, bodyRows]
   */
  private parseResponse(
    response: Connector.ChiliResponse,
    method: 'GetPage' | 'GetModel'
  ): [Row<Required<CellData>>, Array<Row>] {
    if (!response.ok) {
      throw new ConnectorHttpError(
        response.status,
        `Google Sheet: "${method}" failed ${response.status} - ${response.statusText}`
      );
    }
    const spreadsheet: Spreadsheet = JSON.parse(response.text);
    const sheetData = spreadsheet.sheets[0].data;
    const [headerData, regularData] = sheetData;

    if (!headerData.rowData) {
      throw new Error(
        'Header of the spreadsheet document is missing. Ensure that the first row of the sheet always contains data.'
      );
    }
    const headerRow = headerData.rowData[0];

    const bodyRows = regularData.rowData;
    // When we request for range that contains only empty rows (without any custom styling), "bodyRows" will be undefined => we return empty data
    return [headerRow, bodyRows ?? []];
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
    return this.withTiming(async () => {
      if (!sheetId) {
        return null;
      }
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;

      const res = await this.withTiming(
        () => this.runtime.fetch(url, { method: 'GET' }),
        'fetch:fetchSheetName'
      );
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
    }, 'fetchSheetName');
  }

  private isNextPageAvailable(requestedSize: number, resultItems: number) {
    return requestedSize === resultItems;
  }

  /**
   * Executes an async function and measures its execution time.
   * Logging only occurs if the 'logTiming' runtime option is set.
   *
   * @param fn The async function to execute and measure
   * @param methodName The name of the method being timed (for logging purposes)
   * @returns The result of the async function
   */
  private async withTiming<T>(
    fn: () => Promise<T>,
    methodName: string
  ): Promise<T> {
    const shouldLogTiming = !!this.runtime.options['logTiming'];

    if (!shouldLogTiming) {
      return fn();
    }

    // Use performance.now() if available for higher precision, otherwise fall back to Date.now()
    const getTime =
      typeof performance !== 'undefined' &&
      typeof performance.now === 'function'
        ? () => performance.now()
        : () => Date.now();

    const startTime = getTime();
    try {
      const result = await fn();
      const endTime = getTime();
      const executionTime = (endTime - startTime) / 1000;
      this.runtime.logError(
        `[Connector][Timing] "${methodName}" executed in ${executionTime.toFixed(
          2
        )}s`
      );
      return result;
    } catch (error) {
      const endTime = getTime();
      const executionTime = (endTime - startTime) / 1000;
      this.runtime.logError(
        `[Connector][Timing] "${methodName}" failed after ${executionTime.toFixed(
          2
        )}s`
      );
      throw error;
    }
  }
}
