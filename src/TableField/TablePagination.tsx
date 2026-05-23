import type { Table } from '@tanstack/react-table'

import type { TableFieldUIStrings } from './TableFieldI18n.js'
import { ChevronIcon } from './TableIcons.js'

interface TablePaginationProps {
  formatNumber: (value: number) => string
  table: Table<any>
  pageSizes?: number[]
  strings: Pick<
    TableFieldUIStrings,
    'goToPage' | 'nextPage' | 'of' | 'page' | 'perPage' | 'previousPage'
  >
}

export function TablePagination({ formatNumber, table, pageSizes, strings }: TablePaginationProps) {
  const pageCount = Math.max(table.getPageCount(), 1)
  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const rowCount = table.getRowCount()
  const rangeStart = rowCount === 0 ? 0 : pageIndex * pageSize + 1
  const rangeEnd = rowCount === 0 ? 0 : Math.min((pageIndex + 1) * pageSize, rowCount)

  return (
    <div className="payload-table-field__pagination">
      <div className="payload-table-field__page-controls">
        <button
          aria-label={strings.previousPage}
          className={`payload-table-field__clickable-arrow${
            !table.getCanPreviousPage() ? ' payload-table-field__clickable-arrow--disabled' : ''
          }`}
          onClick={event => {
            event.preventDefault()
            table.previousPage()
          }}
          disabled={!table.getCanPreviousPage()}
          type="button"
        >
          <ChevronIcon direction="left" size={14} />
        </button>
        <button
          aria-label={strings.nextPage}
          className={`payload-table-field__clickable-arrow${
            !table.getCanNextPage() ? ' payload-table-field__clickable-arrow--disabled' : ''
          }`}
          onClick={event => {
            event.preventDefault()
            table.nextPage()
          }}
          disabled={!table.getCanNextPage()}
          type="button"
        >
          <ChevronIcon direction="right" size={14} />
        </button>

        <div className="payload-table-field__page-status">
          <div>{strings.page}</div>
          <strong>
            {formatNumber(pageIndex + 1)} {strings.of} {formatNumber(pageCount)}
          </strong>
        </div>

        <label className="payload-table-field__page-jump">
          <span>{strings.goToPage}</span>
          <input
            className="payload-table-field__page-input"
            max={pageCount}
            min={1}
            onChange={event => {
              const nextPage = event.target.value ? Number(event.target.value) - 1 : 0
              table.setPageIndex(nextPage)
            }}
            type="number"
            value={pageIndex + 1}
          />
        </label>
      </div>

      <div className="payload-table-field__page-size-wrap">
        <div>
          {formatNumber(rangeStart)} - {formatNumber(rangeEnd)} {strings.of}{' '}
          {formatNumber(rowCount)}
        </div>

        <select
          className="payload-table-field__page-size"
          onChange={event => {
            table.setPageSize(Number(event.target.value))
          }}
          value={pageSize}
        >
          {(pageSizes || [5, 10, 25, 50, 100]).map(pageSizeValue => (
            <option key={pageSizeValue} value={pageSizeValue}>
              {strings.perPage(pageSizeValue)}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
