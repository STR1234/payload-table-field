import type { Table } from '@tanstack/react-table'
import { flexRender } from '@tanstack/react-table'

import { ChevronIcon } from './TableIcons.js'

interface TableHeadersProps {
  table: Table<any>
}

export function TableHeaders({ table }: TableHeadersProps) {
  return (
    <thead className="payload-table-field__table-head">
      {table.getHeaderGroups().map(headerGroup => (
        <tr key={headerGroup.id}>
          {headerGroup.headers.map(header => {
            return (
              <th key={header.id} colSpan={header.colSpan}>
                {header.isPlaceholder ? null : (
                  <div className="payload-table-field__sort-header">
                    <span className="payload-table-field__sort-label">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </span>

                    {header.column.getCanSort() && (
                      <div className="payload-table-field__sort-buttons">
                        <button
                          onClick={() => header.column.toggleSorting(true)}
                          className={`payload-table-field__sort-button${
                            header.column.getIsSorted() === 'desc'
                              ? ' payload-table-field__sort-button--active'
                              : ''
                          }`}
                          type="button"
                        >
                          <ChevronIcon direction="down" size={12} />
                        </button>
                        <button
                          onClick={() => header.column.toggleSorting(false)}
                          className={`payload-table-field__sort-button${
                            header.column.getIsSorted() === 'asc'
                              ? ' payload-table-field__sort-button--active'
                              : ''
                          }`}
                          type="button"
                        >
                          <ChevronIcon direction="up" size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </th>
            )
          })}
        </tr>
      ))}
    </thead>
  )
}
