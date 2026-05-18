import { rankItem } from '@tanstack/match-sorter-utils'
import type { FilterFn, Row, Table } from '@tanstack/react-table'
import { flexRender } from '@tanstack/react-table'
import type { HTMLProps } from 'react'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { CheckIcon, PinIcon, XIcon } from './TableIcons.js'

/** Checkbox column definition  */
export const checkboxColumn = {
  enableHiding: false,
  id: 'select',
  header: ({ table }: { table: any }) => (
    <IndeterminateCheckbox
      {...{
        checked: table.getIsAllRowsSelected(),
        indeterminate: table.getIsSomeRowsSelected(),
        onChange: table.getToggleAllRowsSelectedHandler(),
      }}
    />
  ),
  cell: ({ row }: { row: any }) => (
    <IndeterminateCheckbox
      {...{
        checked: row.getIsSelected(),
        disabled: !row.getCanSelect(),
        indeterminate: row.getIsSomeSelected(),
        onChange: row.getToggleSelectedHandler(),
      }}
    />
  ),
}

/* Create checkbox for row selection */
export function IndeterminateCheckbox({
  indeterminate,
  className = '',
  ...rest
}: { indeterminate?: boolean } & HTMLProps<HTMLInputElement>) {
  const ref = useRef<HTMLInputElement>(null!)
  const isChecked = Boolean(rest.checked)

  useEffect(() => {
    if (typeof indeterminate === 'boolean') {
      ref.current.indeterminate = !isChecked && indeterminate
    }
  }, [indeterminate, isChecked])

  return (
    <div
      className={`payload-table-field__checkbox${
        isChecked ? ' payload-table-field__checkbox--checked' : ''
      }`}
    >
      <input type="checkbox" ref={ref} className={className} {...rest} />
      {isChecked ? <CheckIcon size={12} /> : null}
    </div>
  )
}

/** Row Pinning Column */

export const pinningColumn = {
  enableHiding: false,
  id: 'pin',
  header: () => 'Pin',
  cell: ({ row }: { row: any }) =>
    row.getIsPinned() ? (
      <button
        type="button"
        aria-label="Unpin row"
        className="payload-table-field__pin-button"
        onClick={() => row.pin(false, false, false)}
      >
        <XIcon />
      </button>
    ) : (
      <button
        type="button"
        aria-label="Pin row"
        className="payload-table-field__pin-button"
        onClick={() => row.pin('top', false, false)}
      >
        <PinIcon />
      </button>
    ),
}

export function PinnedRow({ row, table }: { row: Row<any>; table: Table<any> }) {
  return (
    <tr
      className="payload-table-field__pinned-row"
      style={{
        backgroundColor: 'var(--theme-elevation-200)',
        position: 'sticky',
        top: row.getIsPinned() === 'top' ? `${row.getPinnedIndex() * 49 + 49}px` : undefined,
      }}
    >
      {row.getVisibleCells().map(cell => {
        return <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
      })}
    </tr>
  )
}

/** Skip pagination reset */
export function useSkipper() {
  const shouldSkipRef = useRef(true)
  const shouldSkip = shouldSkipRef.current

  const skip = useCallback(() => {
    shouldSkipRef.current = false
  }, [])

  useEffect(() => {
    shouldSkipRef.current = true
  })

  return [shouldSkip, skip] as const
}

/* Debounced search input */
export function DebouncedInput({
  value: initialValue,
  onChange,
  debounce = 500,
  ...props
}: {
  value: string | number
  onChange: (value: string | number) => void
  debounce?: number
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value)
    }, debounce)

    return () => clearTimeout(timeout)
  }, [debounce, onChange, value])

  return <input {...props} value={value} onChange={e => setValue(e.target.value)} />
}

/** Fuzzy filter */
export const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  // Rank the item
  const itemRank = rankItem(row.getValue(columnId), value)

  // Store the itemRank info
  addMeta({
    itemRank,
  })

  // Return if the item should be filtered in/out
  return itemRank.passed
}
