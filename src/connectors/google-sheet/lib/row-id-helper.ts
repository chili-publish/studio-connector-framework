import { Data } from '@chili-publish/studio-connectors';

export const ITEM_ROW_ID_PROPERTY = '__rowId__' as const;

export const CONTEXT_SPREADSHEET_URL_PROPERTY = 'spreadsheetURL' as const;

export class RowIdHelper {
  /**
   * When the URL has no `gid`, the connector targets the first sheet; row ids use `0` for that case.
   */
  static canonicalSheetId(sheetId: string | null): string {
    return sheetId ?? '0';
  }

  static build(
    spreadsheetId: string,
    sheetId: string | null,
    rowNumber: number
  ): string {
    return `${spreadsheetId}_${RowIdHelper.canonicalSheetId(
      sheetId
    )}_${rowNumber}`;
  }

  /**
   * Parses `{spreadsheetId}_{sheetId}_{rowNumber}`. The spreadsheet id may contain `_`;
   * sheet id and row are the last two segments (sheet id is numeric).
   */
  static parse(id: string): {
    spreadsheetId: string;
    sheetId: string;
    rowNumber: number;
  } | null {
    const parts = id.split('_');
    if (parts.length < 3) {
      return null;
    }
    const rowPart = parts[parts.length - 1]!;
    const sheetIdPart = parts[parts.length - 2]!;
    const spreadsheetId = parts.slice(0, -2).join('_');
    const rowNumber = parseInt(rowPart, 10);
    if (!Number.isInteger(rowNumber) || rowNumber < 2) {
      return null;
    }
    if (!/^\d+$/.test(sheetIdPart)) {
      return null;
    }
    return { spreadsheetId, sheetId: sheetIdPart, rowNumber };
  }

  static assignRowIdToItem(
    item: Data.DataItem,
    spreadsheetId: string,
    sheetId: string | null,
    rowNumber: number
  ): Data.DataItem {
    const rowId = RowIdHelper.build(spreadsheetId, sheetId, rowNumber);
    const rest = { ...(item as Record<string, unknown>) };
    delete rest[ITEM_ROW_ID_PROPERTY];
    return {
      [ITEM_ROW_ID_PROPERTY]: rowId,
      ...rest,
    } as Data.DataItem;
  }
}
