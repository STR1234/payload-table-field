"use client";

import { FieldLabel, useField } from "@payloadcms/ui";
import { RankingInfo } from "@tanstack/match-sorter-utils";
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type FilterFn,
  type PaginationState,
  type Row,
  type RowData,
  type RowPinningState,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import type { JSONFieldClientComponent } from "payload";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { TableControls } from "./TableControls.js";
import "./TableField.css";
import {
  checkboxColumn,
  createPinningColumn,
  fuzzyFilter,
  useSkipper,
} from "./TableFieldHelpers.js";
import { useTableFieldI18n } from "./TableFieldI18n.js";
import {
  applyTableFilterGroups,
  TableFilters,
  type TableFilterGroup,
} from "./TableFilters.js";
import { TableHeaders } from "./TableHeaders.js";
import { PlusIcon, XIcon } from "./TableIcons.js";
import { TablePagination } from "./TablePagination.js";
import {
  createBlankTableRow,
  createTableFieldValue,
  createUniqueColumnKey,
  getTableFieldState,
  TABLE_FIELD_CUSTOM_KEY,
  type TableFieldColumnConfig,
  type TableFieldConfig,
  type TableFieldRow,
  type TableFieldValue,
} from "./types.js";

declare module "@tanstack/react-table" {
  interface TableMeta<TData extends RowData> {
    updateData: (rowIndex: number, columnId: string, value: unknown) => void;
  }

  interface ColumnMeta<TData extends RowData, TValue> {
    label?: string;
    sticky?: "right";
    variant?: "row-actions";
  }
}

declare module "@tanstack/table-core" {
  interface FilterFns {
    fuzzy: FilterFn<unknown>;
  }
  interface FilterMeta {
    itemRank: RankingInfo;
  }
}

const TABLE_ROW_INDEX_KEY = "__payloadTableFieldOriginalIndex" as const;
const TABLE_ROW_ACTIONS_COLUMN_ID = "__payloadTableFieldRowActions" as const;
type TableDisplayRow = TableFieldRow & { [TABLE_ROW_INDEX_KEY]: number };
type TableFieldProps = React.ComponentProps<JSONFieldClientComponent>;

const getTableCellClassName = (
  column: ReturnType<Row<TableDisplayRow>["getVisibleCells"]>[number]["column"]
) => {
  const meta = column.columnDef.meta as
    | {
        sticky?: "right";
        variant?: "row-actions";
      }
    | undefined;
  const classNames = [
    meta?.sticky === "right" ? "payload-table-field__sticky-cell--right" : "",
    meta?.variant === "row-actions" ? "payload-table-field__row-action-cell" : "",
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

const remapRowSelection = (
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

const remapRowPinning = (
  rowPinning: RowPinningState,
  mapIndex: (rowIndex: number) => number | null
): RowPinningState => ({
  bottom: remapRowIds(rowPinning.bottom, mapIndex),
  top: remapRowIds(rowPinning.top, mapIndex),
});

const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }

  if (
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
};

const getTableConfig = (
  field: TableFieldProps["field"]
): TableFieldConfig | undefined => {
  const adminCustom = field.admin?.custom as
    | Record<string, unknown>
    | undefined;
  const config =
    adminCustom?.[TABLE_FIELD_CUSTOM_KEY] ?? adminCustom?.tableField;

  if (!config || typeof config !== "object") {
    return undefined;
  }

  return config as TableFieldConfig;
};

type EditableCellProps = {
  ariaLabel: string;
  columnId: string;
  inputType?: string;
  isReadOnly: boolean;
  onCommit: (value: string) => void;
  placeholder?: string;
  value: unknown;
};

const EditableCell: React.FC<EditableCellProps> = ({
  ariaLabel,
  columnId,
  inputType,
  isReadOnly,
  onCommit,
  placeholder,
  value,
}) => {
  const [inputValue, setInputValue] = useState(formatCellValue(value));

  useEffect(() => {
    setInputValue(formatCellValue(value));
  }, [value]);

  if (isReadOnly) {
    return <span>{formatCellValue(value)}</span>;
  }

  return (
    <input
      aria-label={ariaLabel || columnId}
      className="payload-table-field__cell-input"
      onBlur={() => onCommit(inputValue)}
      onChange={(event) => setInputValue(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
      placeholder={placeholder}
      type={inputType ?? "text"}
      value={inputValue}
    />
  );
};

type ManagedColumnTitleInputProps = {
  ariaLabel: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
};

const ManagedColumnTitleInput: React.FC<ManagedColumnTitleInputProps> = ({
  ariaLabel,
  onChange,
  placeholder,
  value,
}) => {
  return (
    <input
      aria-label={ariaLabel}
      className="payload-table-field__column-title-input"
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      type="text"
      value={value}
    />
  );
};

export const TableFieldClient: JSONFieldClientComponent = ({
  field,
  path,
  readOnly,
  validate,
}) => {
  const tableConfig = getTableConfig(field);
  const configuredColumns = tableConfig?.columns ?? [];
  const dynamicColumnsEnabled = Boolean(tableConfig?.dynamicColumns);
  const { formatNumber, resolveLocalizedString, strings } = useTableFieldI18n(
    tableConfig?.translations
  );

  const memoizedValidate = useCallback(
    (
      value: TableFieldValue | null | undefined,
      options: Record<string, unknown>
    ) => {
      if (!validate) {
        return true;
      }

      return (
        validate as (
          value: TableFieldRow[] | null | undefined,
          options: Record<string, unknown>
        ) => string | Promise<string | true> | true
      )(getTableFieldState(value, configuredColumns).rows, options);
    },
    [configuredColumns, validate]
  );

  const { errorMessage, setValue, showError, value } =
    useField<TableFieldValue>({
      path,
      validate: memoizedValidate as never,
    });

  const [data, setData] = useState<TableFieldRow[]>(
    () => getTableFieldState(value, configuredColumns).rows
  );
  const [managedColumns, setManagedColumns] = useState<
    TableFieldColumnConfig[]
  >(() => getTableFieldState(value, configuredColumns).columns);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: tableConfig?.paginationPageIndex ?? 0,
    pageSize: tableConfig?.paginationPageSize ?? 10,
  });
  const [rowSelection, setRowSelection] = useState({});
  const [rowPinning, setRowPinning] = useState<RowPinningState>({
    bottom: [],
    top: [],
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [showColumns, setShowColumns] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterGroups, setFilterGroups] = useState<TableFilterGroup[]>([]);
  const [recentlyAddedRowIndex, setRecentlyAddedRowIndex] = useState<number | null>(null);
  const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper();
  const rowPinningEnabled = Boolean(tableConfig?.rowPinning);
  const paginationEnabled = Boolean(tableConfig?.pagination);

  useEffect(() => {
    const nextState = getTableFieldState(value, configuredColumns);

    setData(nextState.rows);
    setManagedColumns(nextState.columns);
  }, [configuredColumns, value]);

  const commitTableValue = useCallback(
    (nextRows: TableFieldRow[], nextColumns: TableFieldColumnConfig[]) => {
      setData(nextRows);
      setManagedColumns(nextColumns);
      setValue(
        createTableFieldValue({
          columns: nextColumns,
          dynamicColumns: dynamicColumnsEnabled,
          rows: nextRows,
        })
      );
    },
    [dynamicColumnsEnabled, setValue]
  );

  useEffect(() => {
    if (managedColumns.length === 0) {
      setFilterGroups([]);

      return;
    }

    const fallbackColumnKey = managedColumns[0].key;
    const availableColumnKeys = new Set(
      managedColumns.map((column) => column.key)
    );

    setFilterGroups((currentGroups) =>
      currentGroups.map((group) => ({
        ...group,
        and: group.and.map((condition) => {
          if (availableColumnKeys.has(condition.columnKey)) {
            return condition;
          }

          return {
            ...condition,
            columnKey: fallbackColumnKey,
          };
        }),
      }))
    );
  }, [managedColumns]);

  const updateData = useCallback(
    (rowIndex: number, columnId: string, nextValue: unknown) => {
      skipAutoResetPageIndex();

      const nextData = data.map((row, index) => {
        if (index === rowIndex) {
          return {
            ...row,
            [columnId]: nextValue,
          };
        }

        return row;
      });

      commitTableValue(nextData, managedColumns);
    },
    [commitTableValue, data, managedColumns, skipAutoResetPageIndex]
  );

  const getColumnLabel = useCallback(
    (column: TableFieldColumnConfig) => {
      return resolveLocalizedString(column.label ?? column.name, column.key);
    },
    [resolveLocalizedString]
  );

  const addRow = useCallback(() => {
    if (managedColumns.length === 0) {
      return;
    }

    skipAutoResetPageIndex();

    const nextData = [createBlankTableRow(managedColumns), ...data];

    setRecentlyAddedRowIndex(0);

    setRowSelection((currentSelection) =>
      remapRowSelection(currentSelection, (rowIndex) => rowIndex + 1)
    );

    if (rowPinningEnabled) {
      setRowPinning((currentRowPinning) =>
        remapRowPinning(currentRowPinning, (rowIndex) => rowIndex + 1)
      );
    }

    if (tableConfig?.pagination) {
      setPagination((currentPagination) => ({
        ...currentPagination,
        pageIndex: 0,
      }));
    }

    commitTableValue(nextData, managedColumns);
  }, [
    commitTableValue,
    data,
    managedColumns,
    rowPinningEnabled,
    skipAutoResetPageIndex,
    tableConfig?.pagination,
  ]);

  const removeRow = useCallback(
    (rowIndex: number) => {
      skipAutoResetPageIndex();

      const nextData = data.filter(
        (_, currentIndex) => currentIndex !== rowIndex
      );
      const shiftAfterRemoval = (currentIndex: number) => {
        if (currentIndex === rowIndex) {
          return null;
        }

        return currentIndex > rowIndex ? currentIndex - 1 : currentIndex;
      };

      setRowSelection((currentSelection) =>
        remapRowSelection(currentSelection, shiftAfterRemoval)
      );
      setRecentlyAddedRowIndex((currentRecentRowIndex) => {
        if (currentRecentRowIndex === null) {
          return currentRecentRowIndex;
        }

        return shiftAfterRemoval(currentRecentRowIndex);
      });

      if (rowPinningEnabled) {
        setRowPinning((currentRowPinning) =>
          remapRowPinning(currentRowPinning, shiftAfterRemoval)
        );
      }

      if (tableConfig?.pagination) {
        setPagination((currentPagination) => {
          const maxPageIndex = Math.max(
            Math.ceil(nextData.length / currentPagination.pageSize) - 1,
            0
          );

          if (currentPagination.pageIndex <= maxPageIndex) {
            return currentPagination;
          }

          return {
            ...currentPagination,
            pageIndex: maxPageIndex,
          };
        });
      }

      commitTableValue(nextData, managedColumns);
    },
    [
      commitTableValue,
      data,
      managedColumns,
      rowPinningEnabled,
      skipAutoResetPageIndex,
      tableConfig?.pagination,
    ]
  );

  const updateColumnTitle = useCallback(
    (columnKey: string, nextLabel: string) => {
      const nextColumns = managedColumns.map((column) => {
        if (column.key !== columnKey) {
          return column;
        }

        return {
          ...column,
          label: nextLabel,
        };
      });

      commitTableValue(data, nextColumns);
    },
    [commitTableValue, data, managedColumns]
  );

  const addColumn = useCallback(() => {
    const trimmedColumnTitle = newColumnTitle.trim();

    if (!trimmedColumnTitle) {
      return;
    }

    const nextColumn: TableFieldColumnConfig = {
      enableSorting: true,
      key: createUniqueColumnKey(trimmedColumnTitle, managedColumns),
      label: trimmedColumnTitle,
    };
    const nextColumns = [...managedColumns, nextColumn];
    const nextData = data.map((row) => ({
      ...row,
      [nextColumn.key]: "",
    }));

    skipAutoResetPageIndex();
    setNewColumnTitle("");
    commitTableValue(nextData, nextColumns);
  }, [
    commitTableValue,
    data,
    managedColumns,
    newColumnTitle,
    skipAutoResetPageIndex,
  ]);

  const removeColumn = useCallback(
    (columnKey: string) => {
      const nextColumns = managedColumns.filter(
        (column) => column.key !== columnKey
      );
      const nextData = data.map((row) => {
        if (!(columnKey in row)) {
          return row;
        }

        const { [columnKey]: _removedValue, ...rest } = row;

        return rest;
      });

      setColumnVisibility((currentVisibility) => {
        const nextVisibility = {
          ...(currentVisibility as Record<string, boolean>),
        };

        if (!(columnKey in nextVisibility)) {
          return currentVisibility;
        }

        delete nextVisibility[columnKey];

        return nextVisibility;
      });
      setSorting((currentSorting) =>
        currentSorting.filter((sort) => sort.id !== columnKey)
      );
      commitTableValue(nextData, nextColumns);
    },
    [commitTableValue, data, managedColumns]
  );

  const tableData = useMemo<TableDisplayRow[]>(() => {
    return data.map((row, index) => ({
      ...row,
      [TABLE_ROW_INDEX_KEY]: index,
    }));
  }, [data]);

  const filteredData = useMemo(() => {
    const nextData = applyTableFilterGroups(tableData, filterGroups);

    if (recentlyAddedRowIndex === null) {
      return nextData;
    }

    if (
      nextData.some(
        (row) => row[TABLE_ROW_INDEX_KEY] === recentlyAddedRowIndex
      )
    ) {
      return nextData;
    }

    const recentlyAddedRow = tableData.find(
      (row) => row[TABLE_ROW_INDEX_KEY] === recentlyAddedRowIndex
    );

    return recentlyAddedRow ? [recentlyAddedRow, ...nextData] : nextData;
  }, [filterGroups, recentlyAddedRowIndex, tableData]);

  const globalTableFilter = useCallback<FilterFn<TableDisplayRow>>(
    (row, columnId, filterValue, addMeta) => {
      if (row.original[TABLE_ROW_INDEX_KEY] === recentlyAddedRowIndex) {
        return true;
      }

      return fuzzyFilter(row, columnId, filterValue, addMeta);
    },
    [recentlyAddedRowIndex]
  );

  const columns = useMemo<ColumnDef<TableDisplayRow>[]>(() => {
    if (managedColumns.length === 0) {
      return [];
    }

    return [
      ...(tableConfig?.rowPinning
        ? [
            createPinningColumn({
              pinColumn: strings.pinColumn,
              pinRow: strings.pinRow,
              unpinRow: strings.unpinRow,
            }) as ColumnDef<TableDisplayRow>,
          ]
        : []),
      ...(tableConfig?.rowSelection
        ? [checkboxColumn as ColumnDef<TableDisplayRow>]
        : []),
      ...managedColumns.map<ColumnDef<TableDisplayRow>>((column) => {
        const columnLabel = getColumnLabel(column);
        const placeholder = resolveLocalizedString(column.placeholder);

        return {
          accessorKey: column.key,
          enableSorting: Boolean(column.enableSorting),
          header: columnLabel,
          meta: {
            label: columnLabel,
          },
          cell: ({ getValue, row, column: tableColumn }) => (
            <EditableCell
              ariaLabel={columnLabel}
              columnId={tableColumn.id}
              inputType={column.inputType}
              isReadOnly={
                Boolean(readOnly) ||
                Boolean(column.readOnly) ||
                !tableConfig?.editable
              }
              onCommit={(nextValue) =>
                updateData(
                  row.original[TABLE_ROW_INDEX_KEY],
                  tableColumn.id,
                  nextValue
                )
              }
              placeholder={placeholder || undefined}
              value={getValue()}
            />
          ),
        };
      }),
      ...(tableConfig?.editable && !readOnly
        ? [
            {
              cell: ({ row }) => (
                <button
                  aria-label={`${strings.removeRow}: ${row.index + 1}`}
                  className="payload-table-field__pill payload-table-field__pill--danger"
                  onClick={() => removeRow(row.original[TABLE_ROW_INDEX_KEY])}
                  type="button"
                >
                  <XIcon size={12} />
                </button>
              ),
              enableHiding: false,
              header: () => <XIcon size={12} />,
              id: TABLE_ROW_ACTIONS_COLUMN_ID,
              meta: {
                label: strings.removeRow,
                sticky: "right",
                variant: "row-actions",
              },
            } as ColumnDef<TableDisplayRow>,
          ]
        : []),
    ];
  }, [
    getColumnLabel,
    managedColumns,
    readOnly,
    removeRow,
    resolveLocalizedString,
    strings,
    tableConfig,
    updateData,
  ]);

  const table = useReactTable<TableDisplayRow>({
    columns,
    data: filteredData,
    getRowId: (row) => String(row[TABLE_ROW_INDEX_KEY]),
    state: {
      columnVisibility,
      globalFilter,
      pagination: tableConfig?.pagination ? pagination : undefined,
      rowPinning: tableConfig?.rowPinning ? rowPinning : undefined,
      rowSelection: tableConfig?.rowSelection ? rowSelection : undefined,
      sorting,
    },
    autoResetPageIndex: tableConfig?.editable ? autoResetPageIndex : undefined,
    debugTable: tableConfig?.debugTable,
    enableRowSelection: Boolean(tableConfig?.rowSelection),
    filterFns: {
      fuzzy: fuzzyFilter,
    },
    getCoreRowModel: getCoreRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: tableConfig?.pagination
      ? getPaginationRowModel()
      : undefined,
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: globalTableFilter,
    keepPinnedRows: Boolean(tableConfig?.rowPinning),
    meta: tableConfig?.editable
      ? {
          updateData,
        }
      : undefined,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: tableConfig?.pagination ? setPagination : undefined,
    onRowPinningChange: tableConfig?.rowPinning ? setRowPinning : undefined,
    onRowSelectionChange: tableConfig?.rowSelection
      ? setRowSelection
      : undefined,
    onSortingChange: setSorting,
  });

  const renderTableRow = useCallback(
    (
      row: Row<TableDisplayRow>,
      options?: {
        className?: string;
        keyPrefix?: string;
        style?: React.CSSProperties;
      }
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
    },
    []
  );

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
    recentlyAddedRow && (!paginationEnabled || pagination.pageIndex === 0)
  );
  const centerRows = rowPinningEnabled
    ? table.getCenterRows()
    : table.getRowModel().rows;
  const visibleCenterRows = shouldRenderRecentlyAddedRow
    ? centerRows.filter(
        (row) => row.original[TABLE_ROW_INDEX_KEY] !== recentlyAddedRowIndex
      )
    : centerRows;
  const filtersEnabled =
    tableConfig?.filters !== false && managedColumns.length > 0;
  const canManageColumns = Boolean(
    tableConfig?.editable && dynamicColumnsEnabled && !readOnly
  );
  const canRenderTableUI = managedColumns.length > 0 || canManageColumns;
  const hasConfiguredColumns = managedColumns.length > 0;
  const columnManager = canManageColumns ? (
    <div className="payload-table-field__column-manager">
      <div className="payload-table-field__column-manager-header">
        <span className="payload-table-field__filters-label">
          {strings.tableStructure}
        </span>
        {!hasConfiguredColumns ? (
          <p className="payload-table-field__column-manager-empty">
            {strings.configureColumns}
          </p>
        ) : null}
      </div>

      {hasConfiguredColumns ? (
        <div className="payload-table-field__column-manager-list">
          {managedColumns.map((column) => {
            const columnLabel = getColumnLabel(column);

            return (
              <div
                className="payload-table-field__column-manager-row"
                key={column.key}
              >
                <ManagedColumnTitleInput
                  ariaLabel={`${strings.columnTitle}: ${columnLabel}`}
                  onChange={(nextValue) =>
                    updateColumnTitle(column.key, nextValue)
                  }
                  placeholder={strings.columnTitle}
                  value={columnLabel}
                />
                <span className="payload-table-field__column-key">
                  {column.key}
                </span>
                <button
                  aria-label={`${strings.removeColumn}: ${columnLabel}`}
                  className="payload-table-field__pill payload-table-field__pill--danger"
                  onClick={() => removeColumn(column.key)}
                  type="button"
                >
                  <XIcon size={12} />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="payload-table-field__column-manager-add">
        <ManagedColumnTitleInput
          ariaLabel={strings.columnTitle}
          onChange={setNewColumnTitle}
          placeholder={strings.columnTitle}
          value={newColumnTitle}
        />
        <button
          className="payload-table-field__button payload-table-field__button--primary"
          disabled={!newColumnTitle.trim()}
          onClick={addColumn}
          type="button"
        >
          <span className="payload-table-field__button-label">
            <PlusIcon size={14} />
            {strings.addColumn}
          </span>
        </button>
      </div>
    </div>
  ) : undefined;

  return (
    <div className="payload-table-field">
      {showError && errorMessage ? (
        <div className="payload-table-field__error">{errorMessage}</div>
      ) : null}

      <FieldLabel
        label={field.label ?? field.name}
        path={path}
        required={field.required}
      />

      {!canRenderTableUI ? (
        <p className="payload-table-field__empty">{strings.configureColumns}</p>
      ) : (
        <>
          <TableControls
            columnPanelExtras={columnManager}
            disableAddRow={!hasConfiguredColumns}
            filterPanel={
              filtersEnabled ? (
                <TableFilters
                  columns={managedColumns}
                  groups={filterGroups}
                  onChange={setFilterGroups}
                  resolveColumnLabel={getColumnLabel}
                  strings={strings}
                />
              ) : undefined
            }
            globalFilter={globalFilter}
            onAddRow={tableConfig?.editable && !readOnly ? addRow : undefined}
            onGlobalFilterChange={setGlobalFilter}
            onToggleShowColumns={() =>
              setShowColumns((currentValue) => !currentValue)
            }
            onToggleShowFilters={
              filtersEnabled
                ? () => setShowFilters((currentValue) => !currentValue)
                : undefined
            }
            searchDisabled={!hasConfiguredColumns}
            showColumns={showColumns}
            showFilters={showFilters}
            strings={strings}
            table={table}
          />

          <div className="payload-table-field__table-wrap">
            {hasConfiguredColumns ? (
              <table className="payload-table-field__table">
                <TableHeaders strings={strings} table={table} />
                <tbody>
                  {shouldRenderRecentlyAddedRow && recentlyAddedRow
                    ? renderTableRow(recentlyAddedRow, {
                        className: "payload-table-field__new-row",
                        keyPrefix: "new-row",
                      })
                    : null}

                  {rowPinningEnabled
                    ? table
                        .getTopRows()
                        .map((row) =>
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
                    ? table
                        .getBottomRows()
                        .map((row) =>
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
              </table>
            ) : (
              <div className="payload-table-field__empty-state payload-table-field__empty-state--panel">
                {strings.configureColumns}
              </div>
            )}
          </div>

          {paginationEnabled ? (
            <TablePagination
              formatNumber={formatNumber}
              pageSizes={tableConfig?.paginationPageSizes}
              strings={strings}
              table={table}
            />
          ) : null}
        </>
      )}
    </div>
  );
};
