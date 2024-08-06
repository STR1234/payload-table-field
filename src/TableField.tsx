import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Props } from 'payload/components/fields/Json';
import { Label, useField } from 'payload/components/forms';
import Error from 'payload/dist/admin/components/forms/Error';

import {
  ColumnDef,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  createColumnHelper,
  PaginationState,
  RowPinningState,
  SortingState,
  ColumnOrderState,
  Table,
  flexRender,
} from '@tanstack/react-table';
import { checkboxColumn, fuzzyFilter, PinnedRow, pinningColumn, useSkipper } from './TableFieldHelpers';
import { TablePagination } from './TablePagination';
import { TableControls } from './TableControls';
import { TableHeaders } from './TableHeaders';
import { Button } from 'payload/components/elements'
// import X from 'payload/dist/admin/components/icons/X';

declare module '@tanstack/react-table' {
  interface TableMeta<TData> {
    updateData: (rowIndex: number, columnId: string, value: unknown) => void;
  }
}

type TableFieldProps = Props & {
  path: string;
  label: string;
  required: boolean;
  validate: (value: any, options: any) => boolean;
  tableOptions: {
    columns: Record<string, any>;
    columnOrder: Record<string, number>;
    editable?: boolean;
    rowSelection?: boolean;
    rowDeletion?: boolean;
    rowPinning?: boolean;
    pagination?: boolean;
    paginationPageSize?: number;
    paginationPageIndex?: number;
    paginationPageSizes?: number[];
    debugTable?: boolean;
  };
};

const TableField: React.FC<TableFieldProps> = ({ path, label, required, validate, tableOptions }) => {
  const memoizedValidate = useCallback(
    (value: any[], options: any) => {
      if (validate) {
        return validate(value, { ...options, required });
      }
      return true;
    },
    [validate, required]
  );

  const columnHelper = createColumnHelper<any>();
  const columns = useMemo<ColumnDef<unknown>[]>(
    () => [
      ...(tableOptions.rowPinning ? [pinningColumn] : []),
      ...(tableOptions.rowSelection ? [checkboxColumn] : []),
      ...tableOptions.columns.map((column: any) => {
        return columnHelper.accessor(column.key, {
          enableSorting: column.enableSorting || false,
          cell: ({ getValue, row: { index }, column: { id }, table }) => {
            const initialValue = getValue();
            const [value, setValue] = useState(initialValue);

            const onBlur = () => {
              table.options.meta?.updateData(index, id, value);
              data[index][id] = value;
              setValueInField(data);
            };

            useEffect(() => {
              setValue(initialValue);
            }, [initialValue]);

            return (
              <input
                value={value as string}
                onChange={(e) => setValue(e.target.value)}
                onBlur={onBlur}
              />
            );
          },
        });
      }),
    ],
    []
  );

  const field = useField<any[]>({ path, validate: memoizedValidate });
  const { value, showError, setValue: setValueInField, errorMessage } = field;

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: tableOptions.paginationPageIndex || 0,
    pageSize: tableOptions.paginationPageSize || 10,
  });

  const [rowSelection, setRowSelection] = useState({});
  const [rowPinning, setRowPinning] = useState<RowPinningState>({ top: [], bottom: [] });
  const [keepPinnedRows, setKeepPinnedRows] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [data, setData] = useState(() => [...value]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper();
  const [showFilters, setShowFilters] = useState(false);
  const [showColumns, setShowColumns] = useState(false);

  const tableBaseConfig = {
    state: {
      rowSelection: tableOptions.rowSelection ? rowSelection : undefined,
      rowPinning: tableOptions.rowPinning ? rowPinning : undefined,
      sorting,
      pagination: tableOptions.pagination ? pagination : undefined,
      columnVisibility,
      columnOrder,
      globalFilter,
    },
    columnOrder: ['title', 'id', 'year'],
    enableRowSelection: tableOptions.rowSelection,
    onRowSelectionChange: tableOptions.rowSelection ? setRowSelection : undefined,
    onRowPinningChange: tableOptions.rowPinning ? setRowPinning : undefined,
    onSortingChange: tableOptions.rowSelection ? setSorting : undefined,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: tableOptions.rowSelection ? getSortedRowModel() : undefined,
    getPaginationRowModel: tableOptions.pagination ? getPaginationRowModel() : undefined,
    onPaginationChange: tableOptions.pagination ? setPagination : undefined,
    onGlobalFilterChange: setGlobalFilter,
    getFacetedRowModel: getFacetedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: fuzzyFilter,
    filterFns: {
      fuzzy: fuzzyFilter,
    },
    autoResetPageIndex: tableOptions.editable ? autoResetPageIndex : undefined,
    meta: tableOptions.editable
      ? {
          updateData: (rowIndex: number, columnId: any, value: any) => {
            skipAutoResetPageIndex();
            setData((old) =>
              old.map((row, index) => {
                if (index === rowIndex) {
                  return {
                    ...old[rowIndex]!,
                    [columnId]: value,
                  };
                }
                return row;
              })
            );
          },
        }
      : undefined,
    keepPinnedRows: tableOptions.rowPinning && keepPinnedRows,
    debugTable: tableOptions.debugTable,
  };

  useEffect(() => {
    setValueInField(data);
  }, [data]);

  const tableFieldTemplate = (path: string, label: string, table: Table<any>) => (
    <div className="table-field">
      <Error showError={showError} message={errorMessage as string} />
      <Label htmlFor={path} label={label} required={required} />
      <div className="h-2" />

      <TableControls
        table={table}
        globalFilter={globalFilter}
        onGlobalFilterChange={(value) => {
          setGlobalFilter(value);
        }}
        onToggleShowColumns={(value) => setShowColumns(value)}
        onToggleShowFilters={(value) => setShowFilters(value)}
        showFilters={showFilters}
        showColumns={showColumns}
      ></TableControls>
    {(
      <div className="selection-controls">
        <div>
          {Object.keys(rowSelection).length} of {table.getPreFilteredRowModel().rows.length} Rows
          Selected
        </div>

        {(tableOptions.rowDeletion ?? <Button
              aria-expanded={showColumns}
              aria-controls="example-panel"
              disabled={!Object.keys(rowSelection).length}
              onClick={() => {
                const selectedRowIds = Object.keys(table.getSelectedRowModel().rowsById);
    
                setData((data) => {
                  return data.filter((row) => !selectedRowIds.includes(`${row.id}`));
                });
    
                table.resetRowSelection();
              }}
              className="btn-remove-rows pill pill--style-light pill--has-action btn--style-primary"
            >
            Delete Rows
            </Button>)}
      </div>

    )}

      <div className="table">
        <table>
          <TableHeaders table={table}></TableHeaders>
          <tbody>
            {tableOptions.rowPinning &&
              table.getTopRows().map((row) => <PinnedRow key={row.id} row={row} table={table} />)}
            {table.getRowModel().rows.map((row) => {
              return (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => {
                    return (
                      <td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {tableOptions.pagination && (
        <TablePagination table={table} pageSizes={[5, 10, 25, 50]}></TablePagination>
      )}
    </div>
  );

  const table = useReactTable({
    data,
    columns,
    ...tableBaseConfig,
    getRowId: (originalRow) => (originalRow as { id: any })!.id,
  });

  return tableFieldTemplate(path, (label as string) || 'T', table);
};

export default TableField;