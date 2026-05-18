import type { Table } from '@tanstack/react-table'
import type { ReactNode } from 'react'
import AnimateHeight from 'react-animate-height'

import { DebouncedInput } from './TableFieldHelpers.js'
import type { TableFieldUIStrings } from './TableFieldI18n.js'
import { ChevronIcon, PlusIcon, SearchIcon, XIcon } from './TableIcons.js'

interface TableControlsProps {
  filterPanel?: ReactNode
  onGlobalFilterChange: (value: string) => void
  onToggleShowColumns: () => void
  onToggleShowFilters?: () => void
  showFilters?: boolean
  strings: Pick<TableFieldUIStrings, 'columns' | 'filters' | 'searchPlaceholder'>
  table: Table<any>
  globalFilter: string
  showColumns: boolean
}

const getColumnLabel = (column: ReturnType<Table<any>['getAllLeafColumns']>[number]) => {
  const meta = column.columnDef.meta as { label?: string } | undefined

  return meta?.label ?? column.id
}

export function TableControls({
  filterPanel,
  table,
  onGlobalFilterChange,
  globalFilter,
  showColumns,
  onToggleShowColumns,
  onToggleShowFilters,
  showFilters,
  strings,
}: TableControlsProps) {
  return (
    <div className="payload-table-field__toolbar">
      <div className="payload-table-field__toolbar-main">
        <div className="payload-table-field__search">
          <DebouncedInput
            value={globalFilter ?? ''}
            onChange={value => onGlobalFilterChange(String(value))}
            className="payload-table-field__search-input"
            placeholder={strings.searchPlaceholder}
          />
          <span className="payload-table-field__search-icon">
            <SearchIcon size={16} />
          </span>
        </div>

        <button
          aria-expanded={showColumns}
          className={`payload-table-field__button${
            showColumns ? ' payload-table-field__button--active' : ''
          }`}
          onClick={onToggleShowColumns}
          type="button"
        >
          <span className="payload-table-field__button-label">
            {strings.columns}
            <ChevronIcon direction={showColumns ? 'up' : 'down'} size={14} />
          </span>
        </button>

        {filterPanel && onToggleShowFilters ? (
          <button
            aria-expanded={showFilters}
            className={`payload-table-field__button${
              showFilters ? ' payload-table-field__button--active' : ''
            }`}
            onClick={onToggleShowFilters}
            type="button"
          >
            <span className="payload-table-field__button-label">
              {strings.filters}
              <ChevronIcon direction={showFilters ? 'up' : 'down'} size={14} />
            </span>
          </button>
        ) : null}
      </div>

      <AnimateHeight duration={200} height={showColumns ? 'auto' : 0}>
        <div className="payload-table-field__column-panel">
          {table
            .getAllLeafColumns()
            .filter(column => column.id !== 'pin' && column.id !== 'select')
            .map(column => {
              const isVisible = column.getIsVisible()

              return (
                <button
                  className={`payload-table-field__pill${
                    !isVisible ? ' payload-table-field__pill--inactive' : ''
                  }`}
                  key={column.id}
                  onClick={column.getToggleVisibilityHandler()}
                  type="button"
                >
                  {isVisible ? <XIcon size={12} /> : <PlusIcon size={12} />}
                  <span className="payload-table-field__pill-label">{getColumnLabel(column)}</span>
                </button>
              )
            })}
        </div>
      </AnimateHeight>

      {filterPanel ? (
        <AnimateHeight duration={200} height={showFilters ? 'auto' : 0}>
          <div className="payload-table-field__filter-panel">{filterPanel}</div>
        </AnimateHeight>
      ) : null}
    </div>
  )
}
