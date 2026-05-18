'use client'

import { FieldLabel, useField } from '@payloadcms/ui'
import { RankingInfo } from '@tanstack/match-sorter-utils'
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
  type RowData,
  type RowPinningState,
  type SortingState,
} from '@tanstack/react-table'
import type { JSONFieldClientComponent } from 'payload'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { TableControls } from './TableControls.js'
import './TableField.css'
import {
  checkboxColumn,
  fuzzyFilter,
  PinnedRow,
  pinningColumn,
  useSkipper,
} from './TableFieldHelpers.js'
import { TableHeaders } from './TableHeaders.js'
import { TablePagination } from './TablePagination.js'
import {
  TABLE_FIELD_CUSTOM_KEY,
  type TableFieldColumnConfig,
  type TableFieldConfig,
} from './types.js'

declare module '@tanstack/react-table' {
  interface TableMeta<TData extends RowData> {
    updateData: (rowIndex: number, columnId: string, value: unknown) => void
  }

  interface ColumnMeta<TData extends RowData, TValue> {
    label?: string
  }
}

declare module '@tanstack/table-core' {
  interface FilterFns {
    fuzzy: FilterFn<unknown>
  }
  interface FilterMeta {
    itemRank: RankingInfo
  }
}

type TableRow = Record<string, unknown>
type TableFieldProps = React.ComponentProps<JSONFieldClientComponent>

const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return String(value)
  }

  try {
    return JSON.stringify(value)
  } catch {
    return ''
  }
}

const normalizeTableValue = (value: unknown): TableRow[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map(row => {
    if (row && typeof row === 'object' && !Array.isArray(row)) {
      return row as TableRow
    }

    return {}
  })
}

const getTableConfig = (field: TableFieldProps['field']): TableFieldConfig | undefined => {
  const adminCustom = field.admin?.custom as Record<string, unknown> | undefined
  const config = adminCustom?.[TABLE_FIELD_CUSTOM_KEY] ?? adminCustom?.tableField

  if (!config || typeof config !== 'object') {
    return undefined
  }

  return config as TableFieldConfig
}

type EditableCellProps = {
  column: TableFieldColumnConfig
  columnId: string
  isReadOnly: boolean
  onCommit: (value: string) => void
  value: unknown
}

const EditableCell: React.FC<EditableCellProps> = ({
  column,
  columnId,
  isReadOnly,
  onCommit,
  value,
}) => {
  const [inputValue, setInputValue] = useState(formatCellValue(value))

  useEffect(() => {
    setInputValue(formatCellValue(value))
  }, [value])

  if (isReadOnly) {
    return <span>{formatCellValue(value)}</span>
  }

  return (
    <input
      aria-label={column.label ?? column.name ?? columnId}
      className="payload-table-field__cell-input"
      onBlur={() => onCommit(inputValue)}
      onChange={event => setInputValue(event.target.value)}
      onKeyDown={event => {
        if (event.key === 'Enter') {
          event.currentTarget.blur()
        }
      }}
      placeholder={column.placeholder}
      type={column.inputType ?? 'text'}
      value={inputValue}
    />
  )
}

export const TableFieldClient: JSONFieldClientComponent = ({ field, path, readOnly, validate }) => {
  const tableConfig = getTableConfig(field)

  const memoizedValidate = useCallback(
    (value: TableRow[] | null | undefined, options: Record<string, unknown>) => {
      if (!validate) {
        return true
      }

      return (
        validate as (
          value: TableRow[] | null | undefined,
          options: Record<string, unknown>,
        ) => string | Promise<string | true> | true
      )(value, options)
    },
    [validate],
  )

  const { errorMessage, setValue, showError, value } = useField<TableRow[]>({
    path,
    validate: memoizedValidate as never,
  })

  const [data, setData] = useState<TableRow[]>(() => normalizeTableValue(value))
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: tableConfig?.paginationPageIndex ?? 0,
    pageSize: tableConfig?.paginationPageSize ?? 10,
  })
  const [rowSelection, setRowSelection] = useState({})
  const [rowPinning, setRowPinning] = useState<RowPinningState>({
    bottom: [],
    top: [],
  })
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState({})
  const [globalFilter, setGlobalFilter] = useState('')
  const [showColumns, setShowColumns] = useState(false)
  const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper()

  useEffect(() => {
    setData(normalizeTableValue(value))
  }, [value])

  const updateData = useCallback(
    (rowIndex: number, columnId: string, nextValue: unknown) => {
      skipAutoResetPageIndex()

      const nextData = data.map((row, index) => {
        if (index === rowIndex) {
          return {
            ...row,
            [columnId]: nextValue,
          }
        }

        return row
      })

      setData(nextData)
      setValue(nextData)
    },
    [data, setValue, skipAutoResetPageIndex],
  )

  const columns = useMemo<ColumnDef<TableRow>[]>(() => {
    const configuredColumns = tableConfig?.columns ?? []

    return [
      ...(tableConfig?.rowPinning ? [pinningColumn as ColumnDef<TableRow>] : []),
      ...(tableConfig?.rowSelection ? [checkboxColumn as ColumnDef<TableRow>] : []),
      ...configuredColumns.map<ColumnDef<TableRow>>(column => ({
        accessorKey: column.key,
        enableSorting: Boolean(column.enableSorting),
        header: column.label ?? column.name ?? column.key,
        meta: {
          label: column.label ?? column.name ?? column.key,
        },
        cell: ({ getValue, row, column: tableColumn }) => (
          <EditableCell
            column={column}
            columnId={tableColumn.id}
            isReadOnly={Boolean(readOnly) || Boolean(column.readOnly) || !tableConfig?.editable}
            onCommit={nextValue => updateData(row.index, tableColumn.id, nextValue)}
            value={getValue()}
          />
        ),
      })),
    ]
  }, [readOnly, tableConfig, updateData])

  const table = useReactTable<TableRow>({
    data,
    columns,
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
    getPaginationRowModel: tableConfig?.pagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: fuzzyFilter,
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
    onRowSelectionChange: tableConfig?.rowSelection ? setRowSelection : undefined,
    onSortingChange: setSorting,
  })

  const visibleColumnCount = Math.max(table.getVisibleLeafColumns().length, 1)
  const centerRows = tableConfig?.rowPinning ? table.getCenterRows() : table.getRowModel().rows

  return (
    <div className="payload-table-field">
      {showError && errorMessage ? (
        <div className="payload-table-field__error">{errorMessage}</div>
      ) : null}

      <FieldLabel label={field.label ?? field.name} path={path} required={field.required} />

      {!tableConfig?.columns?.length ? (
        <p className="payload-table-field__empty">Configure at least one table column.</p>
      ) : (
        <>
          <TableControls
            globalFilter={globalFilter}
            onGlobalFilterChange={setGlobalFilter}
            onToggleShowColumns={() => setShowColumns(currentValue => !currentValue)}
            showColumns={showColumns}
            table={table}
          />

          <div className="payload-table-field__table-wrap">
            <table className="payload-table-field__table">
              <TableHeaders table={table} />
              <tbody>
                {tableConfig.rowPinning
                  ? table
                      .getTopRows()
                      .map(row => <PinnedRow key={row.id} row={row} table={table} />)
                  : null}

                {centerRows.length > 0 ? (
                  centerRows.map(row => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="payload-table-field__empty-state" colSpan={visibleColumnCount}>
                      No rows to display.
                    </td>
                  </tr>
                )}

                {tableConfig.rowPinning
                  ? table
                      .getBottomRows()
                      .map(row => <PinnedRow key={row.id} row={row} table={table} />)
                  : null}
              </tbody>
            </table>
          </div>

          {tableConfig.pagination ? (
            <TablePagination table={table} pageSizes={tableConfig.paginationPageSizes} />
          ) : null}
        </>
      )}
    </div>
  )
}
