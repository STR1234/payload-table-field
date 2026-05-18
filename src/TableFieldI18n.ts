'use client'

import { useLocale, useTranslation } from '@payloadcms/ui'
import { useMemo } from 'react'

import { defaultTableFieldTranslations } from './locales/index.js'
import type {
  TableFieldLocalizedString,
  TableFieldTranslationKey,
  TableFieldTranslationsByLocale,
} from './types.js'

const getLocaleCandidates = (...codes: Array<string | null | undefined>) => {
  const seen = new Set<string>()
  const localeCandidates: string[] = []

  for (const code of codes) {
    if (!code) {
      continue
    }

    const normalizedCode = code.trim().replace(/_/g, '-')

    if (!normalizedCode) {
      continue
    }

    const variants = [normalizedCode, normalizedCode.toLowerCase()]
    const baseLanguage = normalizedCode.split('-')[0]

    if (baseLanguage) {
      variants.push(baseLanguage, baseLanguage.toLowerCase())
    }

    for (const variant of variants) {
      if (!variant || seen.has(variant)) {
        continue
      }

      seen.add(variant)
      localeCandidates.push(variant)
    }
  }

  if (!seen.has('en')) {
    localeCandidates.push('en')
  }

  return localeCandidates
}

const getTranslationForLocale = (
  translations: TableFieldTranslationsByLocale | undefined,
  localeCandidates: string[],
  key: TableFieldTranslationKey,
): string | undefined => {
  if (!translations) {
    return undefined
  }

  for (const localeCandidate of localeCandidates) {
    const translation = translations[localeCandidate]?.[key]

    if (translation) {
      return translation
    }
  }

  return undefined
}

export const resolveLocalizedTableString = (
  value: TableFieldLocalizedString | undefined,
  localeCandidates: string[],
  fallback = '',
): string => {
  if (!value) {
    return fallback
  }

  if (typeof value === 'string') {
    return value
  }

  for (const localeCandidate of localeCandidates) {
    const localizedValue = value[localeCandidate]

    if (localizedValue) {
      return localizedValue
    }
  }

  return value.en ?? Object.values(value).find(Boolean) ?? fallback
}

export type TableFieldUIStrings = {
  addCondition: string
  addFilter: string
  addOrGroup: string
  and: string
  columns: string
  configureColumns: string
  filterColumn: string
  filterOperator: string
  filterValue: string
  filterWhere: string
  filters: string
  goToPage: string
  isEmpty: string
  isNotEmpty: string
  nextPage: string
  noFiltersSet: string
  noResultsFound: string
  noRowsToDisplay: string
  of: string
  operators: {
    contains: string
    equals: string
    greaterThan: string
    greaterThanOrEqual: string
    lessThan: string
    lessThanOrEqual: string
    notEquals: string
  }
  or: string
  page: string
  perPage: string
  pinColumn: string
  pinRow: string
  previousPage: string
  removeFilter: string
  searchPlaceholder: string
  sortAscending: string
  sortDescending: string
  unpinRow: string
  value: string
}

export const useTableFieldI18n = (customTranslations?: TableFieldTranslationsByLocale) => {
  const locale = useLocale()
  const { i18n, t } = useTranslation()

  const localeCode =
    locale && typeof locale === 'object' && 'code' in locale && typeof locale.code === 'string'
      ? locale.code
      : undefined

  const localeCandidates = useMemo(
    () => getLocaleCandidates(localeCode, i18n.language),
    [i18n.language, localeCode],
  )

  return useMemo(() => {
    const getPluginString = (key: TableFieldTranslationKey) => {
      return (
        getTranslationForLocale(customTranslations, localeCandidates, key) ??
        getTranslationForLocale(defaultTableFieldTranslations, localeCandidates, key) ??
        defaultTableFieldTranslations.en[key]
      )
    }

    const strings: TableFieldUIStrings = {
      addCondition: getPluginString('addCondition'),
      addFilter: t('general:addFilter'),
      addOrGroup: getPluginString('addOrGroup'),
      and: t('general:and'),
      columns: t('general:columns'),
      configureColumns: getPluginString('configureColumns'),
      filterColumn: getPluginString('filterColumn'),
      filterOperator: getPluginString('filterOperator'),
      filterValue: getPluginString('filterValue'),
      filterWhere: t('general:filterWhere'),
      filters: t('general:filters'),
      goToPage: getPluginString('goToPage'),
      isEmpty: getPluginString('isEmpty'),
      isNotEmpty: getPluginString('isNotEmpty'),
      nextPage: getPluginString('nextPage'),
      noFiltersSet: t('general:noFiltersSet'),
      noResultsFound: t('general:noResultsFound'),
      noRowsToDisplay: getPluginString('noRowsToDisplay'),
      of: getPluginString('of'),
      operators: {
        contains: t('operators:contains'),
        equals: t('operators:equals'),
        greaterThan: t('operators:isGreaterThan'),
        greaterThanOrEqual: t('operators:isGreaterThanOrEqualTo'),
        lessThan: t('operators:isLessThan'),
        lessThanOrEqual: t('operators:isLessThanOrEqualTo'),
        notEquals: t('operators:isNotEqualTo'),
      },
      or: t('general:or'),
      page: getPluginString('page'),
      perPage: t('general:perPage'),
      pinColumn: getPluginString('pinColumn'),
      pinRow: getPluginString('pinRow'),
      previousPage: getPluginString('previousPage'),
      removeFilter: getPluginString('removeFilter'),
      searchPlaceholder: getPluginString('searchPlaceholder'),
      sortAscending: getPluginString('sortAscending'),
      sortDescending: getPluginString('sortDescending'),
      unpinRow: getPluginString('unpinRow'),
      value: getPluginString('value'),
    }

    return {
      formatNumber: (value: number) => value.toLocaleString(localeCandidates[0]),
      localeCandidates,
      resolveLocalizedString: (value: TableFieldLocalizedString | undefined, fallback = '') =>
        resolveLocalizedTableString(value, localeCandidates, fallback),
      strings,
    }
  }, [customTranslations, localeCandidates, t])
}
