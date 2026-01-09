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

export type {
  BaseSheetCells,
  NumberCell,
  DateCell,
  BooleanCell,
  PlainTextCell,
  CellData,
  Row,
  EmptyRowWithoutFormatting,
  Spreadsheet,
  ApiError,
  TypedNumberCell,
  TypedDateCell,
  TypedPlainTextCell,
  TypedBooleanCell,
};
