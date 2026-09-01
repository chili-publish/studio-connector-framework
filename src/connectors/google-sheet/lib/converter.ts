import { Data } from '@chili-publish/studio-connectors';
import type {
  NumberCell,
  DateCell,
  BooleanCell,
  CellData,
  Row,
  EmptyRowWithoutFormatting,
  TypedNumberCell,
  TypedDateCell,
  TypedPlainTextCell,
  TypedBooleanCell,
} from './types';

export class Converter {
  static toDataItems(
    tableHeader: Row<Required<CellData>>,
    tableBody: Array<Row>
  ): Array<Data.DataItem> {
    const tableHeaderValues = tableHeader.values;
    return (
      tableBody
        .map((row) => {
          const item =
            this.normalizeRow(row, tableHeaderValues.length)?.values.reduce(
              (acc, tableCell, colIndex) => {
                const { type, cell } = Converter.toTypedCell(tableCell);

                switch (type) {
                  case 'number':
                    acc[tableHeaderValues[colIndex].formattedValue] =
                      cell.effectiveValue?.numberValue ?? null;
                    break;
                  case 'date':
                    acc[tableHeaderValues[colIndex].formattedValue] =
                      this.convertToDate(cell.effectiveValue?.numberValue);
                    break;
                  case 'boolean':
                    acc[tableHeaderValues[colIndex].formattedValue] =
                      cell.effectiveValue.boolValue;
                    break;
                  case 'singleLine':
                    acc[tableHeaderValues[colIndex].formattedValue] =
                      cell.formattedValue ?? null;
                    break;
                }
                return acc;
              },
              {} as Data.DataItem
            ) ?? null;

          if (item === null) return null;
          return item;
        })
        // Filter out empty rows
        .filter((d): d is Data.DataItem => d !== null)
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
