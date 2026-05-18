import type { JSONField } from 'payload'

export const TABLE_FIELD_COMPONENT_PATH = 'payload-table-field/client#TableFieldClient'
export const TABLE_FIELD_CUSTOM_KEY = 'tableField'

export type TableFieldLocalizedString = Record<string, string> | string

export type TableFieldTranslationKey =
  | 'addCondition'
  | 'addOrGroup'
  | 'configureColumns'
  | 'filterColumn'
  | 'filterOperator'
  | 'filterValue'
  | 'goToPage'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'nextPage'
  | 'noRowsToDisplay'
  | 'of'
  | 'page'
  | 'pinColumn'
  | 'pinRow'
  | 'previousPage'
  | 'removeFilter'
  | 'searchPlaceholder'
  | 'sortAscending'
  | 'sortDescending'
  | 'unpinRow'
  | 'value'

export type TableFieldTranslations = Partial<Record<TableFieldTranslationKey, string>>

export type TableFieldTranslationsByLocale = Record<string, TableFieldTranslations>

export type TableFieldColumnConfig = {
  enableSorting?: boolean
  inputType?: string
  key: string
  label?: TableFieldLocalizedString
  name?: TableFieldLocalizedString
  placeholder?: TableFieldLocalizedString
  readOnly?: boolean
}

export type TableFieldConfig = {
  columns: TableFieldColumnConfig[]
  debugTable?: boolean
  editable?: boolean
  filters?: boolean
  pagination?: boolean
  paginationPageIndex?: number
  paginationPageSize?: number
  paginationPageSizes?: number[]
  rowPinning?: boolean
  rowSelection?: boolean
  translations?: TableFieldTranslationsByLocale
}

export type TableFieldOptions = Omit<JSONField, 'type'>
