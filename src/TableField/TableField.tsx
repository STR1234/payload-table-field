"use client";

import { FieldLabel, useField } from "@payloadcms/ui";
import { RankingInfo } from "@tanstack/match-sorter-utils";
import {
  getCoreRowModel,
  getFacetedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type FilterFn,
  type PaginationState,
  type RowData,
  type RowPinningState,
  type SortingState,
} from "@tanstack/react-table";
import type { JSONFieldClientComponent } from "payload";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";

import {
  createBlankTableRow,
  createTableFieldValue,
  createUniqueColumnKey,
  getTableFieldState,
  TABLE_FIELD_CUSTOM_KEY,
  type TableFieldColumnConfig,
  type TableFieldConfig,
  type TableFieldLocalizedString,
  type TableFieldRow,
  type TableFieldValue,
} from "../types.js";
import { EditableCell } from "./EditableCell.js";
import { TableBody } from "./TableBody.js";
import { TableColumnManager } from "./TableColumnManager.js";
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
import { XIcon } from "./TableIcons.js";
import { TablePagination } from "./TablePagination.js";
import {
  remapRowPinning,
  remapRowSelection,
  TABLE_ROW_ACTIONS_COLUMN_ID,
  TABLE_ROW_INDEX_KEY,
  type TableDisplayRow,
} from "./tableFieldUtils.js";

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

type TableFieldProps = ComponentProps<JSONFieldClientComponent>;

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

const areLocalizedStringsEqual = (
  left: TableFieldLocalizedString | undefined,
  right: TableFieldLocalizedString | undefined
) => {
  if (left === right) {
    return true;
  }

  if (
    !left ||
    !right ||
    typeof left === "string" ||
    typeof right === "string"
  ) {
    return false;
  }

  const leftEntries = Object.entries(left);

  if (leftEntries.length !== Object.keys(right).length) {
    return false;
  }

  return leftEntries.every(([locale, value]) => right[locale] === value);
};

const areColumnConfigsEqual = (
  left: TableFieldColumnConfig[],
  right: TableFieldColumnConfig[]
) => {
  if (left === right) {
    return true;
  }

  if (left.length !== right.length) {
    return false;
  }

  return left.every((column, index) => {
    const nextColumn = right[index];

    return (
      column.key === nextColumn.key &&
      column.enableSorting === nextColumn.enableSorting &&
      column.inputType === nextColumn.inputType &&
      column.readOnly === nextColumn.readOnly &&
      areLocalizedStringsEqual(column.label, nextColumn.label) &&
      areLocalizedStringsEqual(column.name, nextColumn.name) &&
      areLocalizedStringsEqual(column.placeholder, nextColumn.placeholder)
    );
  });
};

const areRowsEqual = (left: TableFieldRow[], right: TableFieldRow[]) => {
  if (left === right) {
    return true;
  }

  if (left.length !== right.length) {
    return false;
  }

  return left.every((row, index) => {
    const nextRow = right[index];

    if (row === nextRow) {
      return true;
    }

    const rowEntries = Object.entries(row);

    if (rowEntries.length !== Object.keys(nextRow).length) {
      return false;
    }

    return rowEntries.every(([key, value]) => Object.is(nextRow[key], value));
  });
};

export const TableFieldClient: JSONFieldClientComponent = ({
  field,
  path: pathFromProps,
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

  const { errorMessage, path, setValue, showError, value } =
    useField<TableFieldValue>({
      potentiallyStalePath: pathFromProps,
      validate: memoizedValidate as never,
    });

  const [data, setData] = useState<TableFieldRow[]>(
    () => getTableFieldState(value, configuredColumns).rows
  );
  const [managedColumns, setManagedColumns] = useState<
    TableFieldColumnConfig[]
  >(() => getTableFieldState(value, configuredColumns).columns);
  const dataRef = useRef<TableFieldRow[]>(data);
  const managedColumnsRef = useRef<TableFieldColumnConfig[]>(managedColumns);
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
  const [recentlyAddedRowIndex, setRecentlyAddedRowIndex] = useState<
    number | null
  >(null);
  const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper();
  const rowPinningEnabled = Boolean(tableConfig?.rowPinning);
  const paginationEnabled = Boolean(tableConfig?.pagination);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    managedColumnsRef.current = managedColumns;
  }, [managedColumns]);

  useEffect(() => {
    const nextState = getTableFieldState(value, configuredColumns);

    setData((currentData) =>
      areRowsEqual(currentData, nextState.rows) ? currentData : nextState.rows
    );
    setManagedColumns((currentColumns) =>
      areColumnConfigsEqual(currentColumns, nextState.columns)
        ? currentColumns
        : nextState.columns
    );
  }, [configuredColumns, value]);

  const commitTableValue = useCallback(
    (nextRows: TableFieldRow[], nextColumns: TableFieldColumnConfig[]) => {
      dataRef.current = nextRows;
      managedColumnsRef.current = nextColumns;
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

      const currentData = dataRef.current;
      const currentColumns = managedColumnsRef.current;
      const currentRow = currentData[rowIndex];

      if (!currentRow || Object.is(currentRow[columnId], nextValue)) {
        return;
      }

      const nextData = currentData.map((row, index) => {
        if (index === rowIndex) {
          return {
            ...row,
            [columnId]: nextValue,
          };
        }

        return row;
      });

      commitTableValue(nextData, currentColumns);
    },
    [commitTableValue, skipAutoResetPageIndex]
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
      nextData.some((row) => row[TABLE_ROW_INDEX_KEY] === recentlyAddedRowIndex)
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

  const filtersEnabled =
    tableConfig?.filters !== false && managedColumns.length > 0;
  const canManageColumns = Boolean(
    tableConfig?.editable && dynamicColumnsEnabled && !readOnly
  );
  const hasConfiguredColumns = managedColumns.length > 0;
  const canRenderTableUI = hasConfiguredColumns || canManageColumns;
  const columnManager = canManageColumns ? (
    <TableColumnManager
      getColumnLabel={getColumnLabel}
      hasConfiguredColumns={hasConfiguredColumns}
      managedColumns={managedColumns}
      newColumnTitle={newColumnTitle}
      onAddColumn={addColumn}
      onNewColumnTitleChange={setNewColumnTitle}
      onRemoveColumn={removeColumn}
      onUpdateColumnTitle={updateColumnTitle}
      strings={strings}
    />
  ) : undefined;

  return (
    <div className="payload-table-field">
      {showError && errorMessage ? (
        <div className="payload-table-field__error">{errorMessage}</div>
      ) : null}

      <FieldLabel
        label={field.label ?? field.name}
        localized={field.localized}
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
                <TableBody
                  pageIndex={pagination.pageIndex}
                  paginationEnabled={paginationEnabled}
                  recentlyAddedRowIndex={recentlyAddedRowIndex}
                  rowPinningEnabled={rowPinningEnabled}
                  strings={strings}
                  table={table}
                />
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
