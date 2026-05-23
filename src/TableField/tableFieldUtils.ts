import type {
  Column,
  RowPinningState,
  RowSelectionState,
} from "@tanstack/react-table";

import type { TableFieldRow } from "../types.js";

export const TABLE_ROW_INDEX_KEY = "__payloadTableFieldOriginalIndex" as const;
export const TABLE_ROW_ACTIONS_COLUMN_ID =
  "__payloadTableFieldRowActions" as const;

export type TableDisplayRow = TableFieldRow & { [TABLE_ROW_INDEX_KEY]: number };

export const getTableCellClassName = (
  column: Column<TableDisplayRow, unknown>
) => {
  const meta = column.columnDef.meta as
    | {
        sticky?: "right";
        variant?: "row-actions";
      }
    | undefined;
  const classNames = [
    meta?.sticky === "right" ? "payload-table-field__sticky-cell--right" : "",
    meta?.variant === "row-actions"
      ? "payload-table-field__row-action-cell"
      : "",
  ].filter(Boolean);

  return classNames.length > 0 ? classNames.join(" ") : undefined;
};

const remapRowIds = (
  rowIds: string[] | undefined,
  mapIndex: (rowIndex: number) => number | null
): string[] | undefined => {
  if (!rowIds) {
    return rowIds;
  }

  return rowIds.flatMap((rowId) => {
    const rowIndex = Number(rowId);

    if (!Number.isInteger(rowIndex)) {
      return [rowId];
    }

    const nextIndex = mapIndex(rowIndex);

    return nextIndex === null ? [] : [String(nextIndex)];
  });
};

export const remapRowSelection = (
  rowSelection: RowSelectionState,
  mapIndex: (rowIndex: number) => number | null
): RowSelectionState => {
  return Object.fromEntries(
    Object.entries(rowSelection).flatMap(([rowId, isSelected]) => {
      const rowIndex = Number(rowId);

      if (!Number.isInteger(rowIndex)) {
        return [[rowId, isSelected]];
      }

      const nextIndex = mapIndex(rowIndex);

      return nextIndex === null ? [] : [[String(nextIndex), isSelected]];
    })
  ) as RowSelectionState;
};

export const remapRowPinning = (
  rowPinning: RowPinningState,
  mapIndex: (rowIndex: number) => number | null
): RowPinningState => ({
  bottom: remapRowIds(rowPinning.bottom, mapIndex),
  top: remapRowIds(rowPinning.top, mapIndex),
});
