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
  createPinningColumn,
  fuzzyFilter,
  PinnedRow,
  useSkipper,
} from './TableFieldHelpers.js'
import { useTableFieldI18n } from './TableFieldI18n.js'
import { applyTableFilterGroups, TableFilters, type TableFilterGroup } from './TableFilters.js'
import { TableHeaders } from './TableHeaders.js'
import { TablePagination } from './TablePagination.js'
import { TABLE_FIELD_CUSTOM_KEY, type TableFieldConfig } from './types.js'

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
const TABLE_ROW_INDEX_KEY = '__payloadTableFieldOriginalIndex' as const
type TableDisplayRow = TableRow & { [TABLE_ROW_INDEX_KEY]: number }
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
  ariaLabel: string
  columnId: string
  inputType?: string
  isReadOnly: boolean
  onCommit: (value: string) => void
  placeholder?: string
  value: unknown
}

const EditableCell: React.FC<EditableCellProps> = ({
  ariaLabel,
  columnId,
  inputType,
  isReadOnly,
  onCommit,
  placeholder,
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
      aria-label={ariaLabel || columnId}
      className="payload-table-field__cell-input"
      onBlur={() => onCommit(inputValue)}
      onChange={event => setInputValue(event.target.value)}
      onKeyDown={event => {
        if (event.key === 'Enter') {
          event.currentTarget.blur()
        }
      }}
      placeholder={placeholder}
      type={inputType ?? 'text'}
      value={inputValue}
    />
  )
}

export const TableFieldClient: JSONFieldClientComponent = ({ field, path, readOnly, validate }) => {
  const tableConfig = getTableConfig(field)
  const { formatNumber, resolveLocalizedString, strings } = useTableFieldI18n(
    tableConfig?.translations,
  )

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
  const [showFilters, setShowFilters] = useState(false)
  const [filterGroups, setFilterGroups] = useState<TableFilterGroup[]>([])
  const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper()

  useEffect(() => {
    setData(normalizeTableValue(value))
  }, [value])

  useEffect(() => {
    const configuredColumns = tableConfig?.columns ?? []

    if (configuredColumns.length === 0) {
      setFilterGroups([])

      return
    }

    const fallbackColumnKey = configuredColumns[0].key
    const availableColumnKeys = new Set(configuredColumns.map(column => column.key))

    setFilterGroups(currentGroups =>
      currentGroups.map(group => ({
        ...group,
        and: group.and.map(condition => {
          if (availableColumnKeys.has(condition.columnKey)) {
            return condition
          }

          return {
            ...condition,
            columnKey: fallbackColumnKey,
          }
        }),
      })),
    )
  }, [tableConfig?.columns])

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

  const getColumnLabel = useCallback(
    (column: NonNullable<TableFieldConfig['columns']>[number]) => {
      return resolveLocalizedString(column.label ?? column.name, column.key)
    },
    [resolveLocalizedString],
  )

  const tableData = useMemo<TableDisplayRow[]>(() => {
    return data.map((row, index) => ({
      ...row,
      [TABLE_ROW_INDEX_KEY]: index,
    }))
  }, [data])

  const filteredData = useMemo(() => {
    return applyTableFilterGroups(tableData, filterGroups)
  }, [filterGroups, tableData])

  const columns = useMemo<ColumnDef<TableDisplayRow>[]>(() => {
    const configuredColumns = tableConfig?.columns ?? []

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
      ...(tableConfig?.rowSelection ? [checkboxColumn as ColumnDef<TableDisplayRow>] : []),
      ...configuredColumns.map<ColumnDef<TableDisplayRow>>(column => {
        const columnLabel = getColumnLabel(column)
        const placeholder = resolveLocalizedString(column.placeholder)

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
              isReadOnly={Boolean(readOnly) || Boolean(column.readOnly) || !tableConfig?.editable}
              onCommit={nextValue =>
                updateData(row.original[TABLE_ROW_INDEX_KEY], tableColumn.id, nextValue)
              }
              placeholder={placeholder || undefined}
              value={getValue()}
            />
          ),
        }
      }),
    ]
  }, [getColumnLabel, readOnly, resolveLocalizedString, strings, tableConfig, updateData])

  const table = useReactTable<TableDisplayRow>({
    columns,
    data: filteredData,
    getRowId: row => String(row[TABLE_ROW_INDEX_KEY]),
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
  const filtersEnabled = tableConfig?.filters !== false

  return (
    <div className="payload-table-field">
      {showError && errorMessage ? (
        <div className="payload-table-field__error">{errorMessage}</div>
      ) : null}

      <FieldLabel label={field.label ?? field.name} path={path} required={field.required} />

      {!tableConfig?.columns?.length ? (
        <p className="payload-table-field__empty">{strings.configureColumns}</p>
      ) : (
        <>
          <TableControls
            filterPanel={
              filtersEnabled ? (
                <TableFilters
                  columns={tableConfig.columns}
                  groups={filterGroups}
                  onChange={setFilterGroups}
                  resolveColumnLabel={getColumnLabel}
                  strings={strings}
                />
              ) : undefined
            }
            globalFilter={globalFilter}
            onGlobalFilterChange={setGlobalFilter}
            onToggleShowColumns={() => setShowColumns(currentValue => !currentValue)}
            onToggleShowFilters={
              filtersEnabled ? () => setShowFilters(currentValue => !currentValue) : undefined
            }
            showColumns={showColumns}
            showFilters={showFilters}
            strings={strings}
            table={table}
          />

          <div className="payload-table-field__table-wrap">
            <table className="payload-table-field__table">
              <TableHeaders strings={strings} table={table} />
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
                      {strings.noRowsToDisplay}
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
            <TablePagination
              formatNumber={formatNumber}
              pageSizes={tableConfig.paginationPageSizes}
              strings={strings}
              table={table}
            />
          ) : null}
        </>
      )}
    </div>
  )
}
