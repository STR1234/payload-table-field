import type { JSONField } from 'payload'

import {
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
  TableFieldTranslationKey,
  TableFieldTranslations,
  TableFieldTranslationsByLocale,
} from './types.js'

export const tableField = (
  options: TableFieldOptions,
  tableOptions: TableFieldConfig,
): JSONField => {
  const incomingAdmin = options.admin ?? {}
  const incomingComponents = incomingAdmin.components ?? {}
  const incomingAdminCustom = incomingAdmin.custom ?? {}

  return {
    ...options,
    type: 'json',
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
