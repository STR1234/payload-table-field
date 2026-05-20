import type { JSONField } from 'payload'

import {
    getTableFieldRows,
    TABLE_FIELD_COMPONENT_PATH,
    TABLE_FIELD_CUSTOM_KEY,
    type TableFieldConfig,
    type TableFieldOptions,
} from './types.js'

export { TABLE_FIELD_COMPONENT_PATH, TABLE_FIELD_CUSTOM_KEY } from './types.js'
export type {
    TableFieldColumnConfig,
    TableFieldConfig,
    TableFieldLocalizedString,
    TableFieldOptions,
    TableFieldRow,
    TableFieldTranslationKey,
    TableFieldTranslations,
    TableFieldTranslationsByLocale,
    TableFieldValue,
    TableFieldValueObject
} from './types.js'

export const tableField = (
  options: TableFieldOptions,
  tableOptions: TableFieldConfig,
): JSONField => {
  type JSONTableFieldValidate = Exclude<JSONField['validate'], undefined>
  type LooseTableFieldValidate = (
    value: unknown,
    validateOptions: Record<string, unknown>,
  ) => string | Promise<string | true> | true

  const incomingAdmin = options.admin ?? {}
  const incomingComponents = incomingAdmin.components ?? {}
  const incomingAdminCustom = incomingAdmin.custom ?? {}
  const incomingValidate = options.validate as LooseTableFieldValidate | undefined

  return {
    ...options,
    type: 'json',
    validate:
      incomingValidate
        ? (((value, validateOptions) =>
            incomingValidate(getTableFieldRows(value), validateOptions)) as JSONTableFieldValidate)
        : options.validate,
    admin: {
      ...incomingAdmin,
      custom: {
        ...incomingAdminCustom,
        [TABLE_FIELD_CUSTOM_KEY]: tableOptions,
      },
      components: {
        ...incomingComponents,
        Field: TABLE_FIELD_COMPONENT_PATH,
      },
    },
  }
}
