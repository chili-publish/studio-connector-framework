export class RangeHelper {
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

  static buildPreviousPageRange(currentRange: string, limit: number) {
    const [sheetName, startRow] = RangeHelper.extractFromRange(currentRange);
    if (Number.isNaN(startRow)) {
      throw new Error(`Incorrect format of the cells range "${currentRange}"`);
    }
    const prevEndRow = startRow - 1;
    const prevStartRow = Math.max(2, prevEndRow - limit + 1);
    return RangeHelper.buildRange(sheetName, prevStartRow, prevEndRow);
  }

  static buildRowRange(sheetName: string | null, rowNumber: number) {
    return RangeHelper.buildRange(sheetName, rowNumber, rowNumber);
  }

  /**
   * Returns the range string for the next page page given the row number and the page size (limit).
   * Row numbers are 1-indexed in the sheet; row 1 is the
   * header, so data rows start at row 2.
   */
  static buildRangeForNextPage(
    sheetName: string | null,
    rowNumber: number,
    limit: number
  ) {
    const isFirstPage = RangeHelper.isFirstPage(rowNumber, limit);

    if (isFirstPage) {
      return RangeHelper.buildRange(
        sheetName,
        rowNumber + 1,
        rowNumber + limit
      );
    }

    const pageStartRow = rowNumber + 1;
    const pageEndRow = pageStartRow + limit - 1;

    return RangeHelper.buildRange(sheetName, pageStartRow, pageEndRow);
  }

  static buildRangeForPreviousPage(
    sheetName: string | null,
    rowNumber: number,
    limit: number
  ) {
    const isFirstPage = RangeHelper.isFirstPage(rowNumber, limit);

    if (isFirstPage) {
      if (rowNumber - 1 < 2) return null; // (row 2 → pos 0)
      return RangeHelper.buildRange(sheetName, 2, rowNumber - 1);
    }

    const pageEndRow = rowNumber - 1;
    const pageStartRow = Math.max(2, pageEndRow - limit + 1);

    return RangeHelper.buildRange(sheetName, pageStartRow, pageEndRow);
  }

  static getStartRow(range: string): number {
    const [, startRow] = RangeHelper.extractFromRange(range);
    return startRow;
  }

  static getEndRow(range: string): number {
    const [, , endRow] = RangeHelper.extractFromRange(range);
    return endRow;
  }

  /**
   * Builds a range for `limit` rows starting at startRow. Use when resolving
   * continuationToken with a possibly changed limit.
   */
  static buildRangeFromStartRow(
    sheetName: string | null,
    startRow: number,
    limit: number
  ): string {
    return RangeHelper.buildRange(
      sheetName,
      startRow,
      startRow + Math.max(0, limit - 1)
    );
  }

  /**
   * Builds the previous page range when the token encodes the previous page's
   * range and the request may use a different limit. Returns the last `limit`
   * rows before the row after tokenEndRow.
   */
  static buildPreviousPageRangeFromToken(
    sheetName: string | null,
    tokenEndRow: number,
    limit: number
  ): string {
    const prevEndRow = tokenEndRow;
    const prevStartRow = Math.max(2, prevEndRow - limit + 1);
    return RangeHelper.buildRange(sheetName, prevStartRow, prevEndRow);
  }

  private static buildRange(
    sheetName: string | null,
    start: number,
    end: number
  ) {
    return sheetName ? `${sheetName}!${start}:${end}` : `${start}:${end}`;
  }

  static isFirstPage(rowNumber: number, limit: number) {
    const dataPos = rowNumber - 2; // 0-indexed data position (row 2 → pos 0)
    const pageIndex = Math.floor(dataPos / limit);
    return pageIndex === 0;
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
