import de from './de.json' with { type: 'json' }
import en from './en.json' with { type: 'json' }
import nl from './nl.json' with { type: 'json' }

import type { TableFieldTranslationKey } from '../types.js'

const assertLocale = (locale: Record<string, string>) => {
  return locale as Record<TableFieldTranslationKey, string>
}

export const defaultTableFieldTranslations: Record<string, Record<TableFieldTranslationKey, string>> = {
  de: assertLocale(de),
  en: assertLocale(en),
  nl: assertLocale(nl),
}
