import {
  Connector,
  Data,
  BidirectionalDataPageItem,
} from '@chili-publish/studio-connectors';
import { Converter } from './lib/converter';
import { RangeHelper } from './lib/range-helper';
import {
  CONTEXT_SPREADSHEET_URL_PROPERTY,
  ITEM_ROW_ID_PROPERTY,
  RowIdHelper,
} from './lib/row-id-helper';
import type {
  ApiError,
  CellData,
  Row,
  Spreadsheet,
} from './lib/types';

const FIELDS_MASK = `sheets.properties(sheetId,title),sheets.data.rowData.values(formattedValue,effectiveFormat.numberFormat.type,effectiveValue)`;
export default class GoogleSheetConnector
  implements Data.DataConnector, Data.DataSourceVariableCapability
{
  private runtime: Connector.ConnectorRuntimeContext;
  constructor(runtime: Connector.ConnectorRuntimeContext) {
    this.runtime = runtime;
  }

  async getPage(
    config: Data.BidirectionalPageConfig,
    context: Connector.Dictionary
  ): Promise<Data.BidirectionalDataPage> {
    return this.withTiming(async () => {
      const { spreadsheetId, sheetId } =
        this.extractSheetIdentityFromContext(context);

      if (config.limit < 1) {
        return {
          previousPageToken: null,
          continuationToken: null,
          data: [],
        };
      }
      const sheetName = await this.fetchSheetName(spreadsheetId, sheetId);

      // Resolve the cell range to fetch using the current request's limit, so
      // that a changed page size between requests is respected.
      let cellsRange: string;
      if (config.continuationToken) {
        const startRow = RangeHelper.getStartRow(config.continuationToken);
        cellsRange = RangeHelper.buildRangeFromStartRow(
          sheetName,
          startRow,
          config.limit
        );
      } else if (config.previousPageToken) {
        const tokenEndRow = RangeHelper.getEndRow(config.previousPageToken);
        cellsRange = RangeHelper.buildPreviousPageRangeFromToken(
          sheetName,
          tokenEndRow,
          config.limit
        );
      } else {
        cellsRange = RangeHelper.buildFirstPageRange(sheetName, config.limit);
      }

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

      // We handle 400 in a specific way since it might be related to requesting the last "empty" batch of records
      // during batch output generation. In this case we need to complete request as success with empty return data
      if (!res.ok && res.status === 400) {
        try {
          const { error }: ApiError = JSON.parse(res.text);
          this.runtime.logError(
            `Google Sheet: GetPage failed ${res.status} - ${error.message}`
          );
          return {
            previousPageToken: null,
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

      const startRowNumber = RangeHelper.getStartRow(cellsRange);
      const data = Converter.toDataItems(headerRow, bodyRows).map((item, i) =>
        RowIdHelper.assignRowIdToItem(
          item,
          spreadsheetId,
          sheetId,
          startRowNumber + i
        )
      );

      // Return the range to request for each direction (different tokens).
      const isFirstPage = startRowNumber === 2;
      const hasNextPage = this.shouldOfferContinuationToken(
        config,
        cellsRange,
        data.length
      );

      return {
        previousPageToken: isFirstPage
          ? null
          : RangeHelper.buildPreviousPageRange(cellsRange, config.limit),
        continuationToken: hasNextPage
          ? RangeHelper.buildNextPageRange(cellsRange, config.limit)
          : null,
        data,
      };
    }, 'getPage');
  }

  async getModel(
    context: Connector.Dictionary
  ): Promise<Data.DataSourceVariableDataModel> {
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
              RangeHelper.buildFirstPageRange(sheetName, 1)
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
        properties: [
          ...properties,
          { name: ITEM_ROW_ID_PROPERTY, type: 'singleLine' },
        ],
        itemIdPropertyName: ITEM_ROW_ID_PROPERTY,
      };
    }, 'getModel');
  }

  getConfigurationOptions(): Connector.ConnectorConfigValue[] | null {
    return [
      {
        type: 'text',
        name: CONTEXT_SPREADSHEET_URL_PROPERTY,
        displayName: 'Spreadsheet URL',
      },
    ];
  }

  getCapabilities(): Data.DataConnectorCapabilities {
    return {
      filtering: false,
      sorting: false,
      model: true,
      dataSourceVariable: true,
    };
  }

  async getPageItemById(
    id: string,
    pageOptions: Data.PageItemOptions,
    context: Connector.Dictionary
  ): Promise<BidirectionalDataPageItem> {
    return this.withTiming(async () => {
      const { spreadsheetId, sheetId } =
        this.extractSheetIdentityFromContext(context);

      const parsed = RowIdHelper.parse(id);
      if (!parsed) {
        throw new Error(
          `Google Sheet: Invalid ${ITEM_ROW_ID_PROPERTY} "${id}". Expected format "{spreadsheetId}_{sheetId}_{rowNumber}" with numeric sheet id and row number >= 2.`
        );
      }

      const expectedSheetKey = RowIdHelper.canonicalSheetId(sheetId);
      if (
        parsed.spreadsheetId !== spreadsheetId ||
        parsed.sheetId !== expectedSheetKey
      ) {
        throw new Error(
          `Google Sheet: ${ITEM_ROW_ID_PROPERTY} "${id}" does not match the current "${CONTEXT_SPREADSHEET_URL_PROPERTY}" context (spreadsheetURL: "${context[CONTEXT_SPREADSHEET_URL_PROPERTY]}").`
        );
      }

      const rowNumber = parsed.rowNumber;
      const sheetName = await this.fetchSheetName(spreadsheetId, sheetId);
      const limit = Math.max(1, pageOptions.limit);

      const res = await this.withTiming(
        () =>
          this.runtime.fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/?fields=${FIELDS_MASK}&ranges=${encodeURIComponent(
              RangeHelper.buildHeaderRange(sheetName)
            )}&ranges=${encodeURIComponent(
              RangeHelper.buildRowRange(sheetName, rowNumber)
            )}`,
            { method: 'GET' }
          ),
        'fetch:getPageItemById'
      );

      if (!res.ok && (res.status === 400 || res.status === 404)) {
        try {
          const { error }: ApiError = JSON.parse(res.text);
          this.runtime.logError(
            `Google Sheet: getPageItemById failed ${res.status} - ${error.message}`
          );
        } catch {
          // ignore parse failure
        }
        throw new Error(
          `Google Sheet: Record not found for ${ITEM_ROW_ID_PROPERTY} "${id}". The row may not exist or be outside the sheet.`
        );
      }

      const [headerRow, bodyRows] = this.parseResponse(res, 'GetPageItemById');
      const items = Converter.toDataItems(headerRow, bodyRows).map((item, i) =>
        RowIdHelper.assignRowIdToItem(
          item,
          spreadsheetId,
          sheetId,
          rowNumber + i
        )
      );

      if (items.length === 0) {
        throw new Error(
          `Google Sheet: No data found for row ${rowNumber} (${ITEM_ROW_ID_PROPERTY} "${id}").`
        );
      }

      const item = items[0];

      const nextPageRange = RangeHelper.buildRangeForNextPage(
        sheetName,
        rowNumber,
        limit
      );

      const previousPageRange = RangeHelper.buildRangeForPreviousPage(
        sheetName,
        rowNumber,
        limit
      );

      return {
        data: item,
        previousPageToken: previousPageRange,
        continuationToken: nextPageRange,
      };
    }, 'getPageItemById');
  }

  /**
   * Parse response and extract header and body data for the further processing
   * @param response
   * @returns [headerRow, bodyRows]
   */
  private logReservedRowIdColumnIfPresent(
    headerRow: Row<Required<CellData>>
  ): void {
    if (
      headerRow.values.some(
        (cell) => cell.formattedValue === ITEM_ROW_ID_PROPERTY
      )
    ) {
      this.runtime.logError(
        `Google Sheet: The sheet defines a column header "${ITEM_ROW_ID_PROPERTY}", which is reserved. Cell values under that column are ignored; ${ITEM_ROW_ID_PROPERTY} is set from spreadsheet id, sheet id, and row number.`
      );
    }
  }

  private parseResponse(
    response: Connector.ChiliResponse,
    method: 'GetPage' | 'GetModel' | 'GetPageItemById'
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
    this.logReservedRowIdColumnIfPresent(headerRow);

    const bodyRows = regularData.rowData;
    // When we request for range that contains only empty rows (without any custom styling), "bodyRows" will be undefined => we return empty data
    return [headerRow, bodyRows ?? []];
  }

  private extractSheetIdentityFromContext(context: Connector.Dictionary): {
    spreadsheetId: string;
    sheetId: string | null;
  } {
    const spreadsheetURL = context[CONTEXT_SPREADSHEET_URL_PROPERTY];

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

  private shouldOfferContinuationToken(
    config: Data.BidirectionalPageConfig,
    cellsRange: string,
    dataLength: number
  ): boolean {
    if (this.isNextPageAvailable(config.limit, dataLength)) {
      return true;
    }
    if (!config.previousPageToken) {
      return false;
    }
    const startRow = RangeHelper.getStartRow(cellsRange);
    const endRow = RangeHelper.getEndRow(cellsRange);
    const rowsInRequestedRange = endRow - startRow + 1;
    return startRow === 2 && rowsInRequestedRange < config.limit;
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
