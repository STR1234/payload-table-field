import { flexRender, type Row, type Table } from "@tanstack/react-table";
import type { CSSProperties } from "react";

import type { TableFieldUIStrings } from "./TableFieldI18n.js";
import {
  getTableCellClassName,
  TABLE_ROW_INDEX_KEY,
  type TableDisplayRow,
} from "./tableFieldUtils.js";

type RenderTableRowOptions = {
  className?: string;
  keyPrefix?: string;
  style?: CSSProperties;
};

type TableBodyProps = {
  pageIndex: number;
  paginationEnabled: boolean;
  recentlyAddedRowIndex: number | null;
  rowPinningEnabled: boolean;
  strings: Pick<TableFieldUIStrings, "noRowsToDisplay">;
  table: Table<TableDisplayRow>;
};

const renderTableRow = (
  row: Row<TableDisplayRow>,
  options?: RenderTableRowOptions
) => {
  return (
    <tr
      className={options?.className}
      key={`${options?.keyPrefix ?? "row"}-${row.id}`}
      style={options?.style}
    >
      {row.getVisibleCells().map((cell) => (
        <td className={getTableCellClassName(cell.column)} key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  );
};

export const TableBody = ({
  pageIndex,
  paginationEnabled,
  recentlyAddedRowIndex,
  rowPinningEnabled,
  strings,
  table,
}: TableBodyProps) => {
  const visibleColumnCount = Math.max(table.getVisibleLeafColumns().length, 1);
  const recentlyAddedRow =
    recentlyAddedRowIndex === null
      ? undefined
      : table
          .getPrePaginationRowModel()
          .rows.find(
            (row) => row.original[TABLE_ROW_INDEX_KEY] === recentlyAddedRowIndex
          );
  const shouldRenderRecentlyAddedRow = Boolean(
    recentlyAddedRow && (!paginationEnabled || pageIndex === 0)
  );
  const centerRows = rowPinningEnabled
    ? table.getCenterRows()
    : table.getRowModel().rows;
  const visibleCenterRows = shouldRenderRecentlyAddedRow
    ? centerRows.filter(
        (row) => row.original[TABLE_ROW_INDEX_KEY] !== recentlyAddedRowIndex
      )
    : centerRows;

  return (
    <tbody>
      {shouldRenderRecentlyAddedRow && recentlyAddedRow
        ? renderTableRow(recentlyAddedRow, {
            className: "payload-table-field__new-row",
            keyPrefix: "new-row",
          })
        : null}

      {rowPinningEnabled
        ? table.getTopRows().map((row) =>
            renderTableRow(row, {
              className: "payload-table-field__pinned-row",
              keyPrefix: "pinned-top",
              style: {
                backgroundColor: "var(--theme-elevation-200)",
                position: "sticky",
                top:
                  row.getIsPinned() === "top"
                    ? `${row.getPinnedIndex() * 49 + 49}px`
                    : undefined,
              },
            })
          )
        : null}

      {visibleCenterRows.length > 0 ? (
        visibleCenterRows.map((row) => renderTableRow(row))
      ) : (
        <tr>
          <td
            className="payload-table-field__empty-state"
            colSpan={visibleColumnCount}
          >
            {strings.noRowsToDisplay}
          </td>
        </tr>
      )}

      {rowPinningEnabled
        ? table.getBottomRows().map((row) =>
            renderTableRow(row, {
              className: "payload-table-field__pinned-row",
              keyPrefix: "pinned-bottom",
              style: {
                backgroundColor: "var(--theme-elevation-200)",
                position: "sticky",
              },
            })
          )
        : null}
    </tbody>
  );
};
