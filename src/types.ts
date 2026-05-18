import type { JSONField } from 'payload'

export const TABLE_FIELD_COMPONENT_PATH = 'payload-table-field/client#TableFieldClient'
export const TABLE_FIELD_CUSTOM_KEY = 'tableField'

export type TableFieldColumnConfig = {
  enableSorting?: boolean
  inputType?: string
  key: string
  label?: string
  name?: string
  placeholder?: string
  readOnly?: boolean
}

export type TableFieldConfig = {
  columns: TableFieldColumnConfig[]
  debugTable?: boolean
  editable?: boolean
  pagination?: boolean
  paginationPageIndex?: number
  paginationPageSize?: number
  paginationPageSizes?: number[]
  rowPinning?: boolean
  rowSelection?: boolean
}

export type TableFieldOptions = Omit<JSONField, 'type'>
