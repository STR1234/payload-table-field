import type { JSONField } from "payload";

export const TABLE_FIELD_COMPONENT_PATH =
  "payload-table-field/client#TableFieldClient";
export const TABLE_FIELD_CUSTOM_KEY = "tableField";

export type TableFieldLocalizedString = Record<string, string> | string;
export type TableFieldRow = Record<string, unknown>;

export type TableFieldTranslationKey =
  | "addColumn"
  | "addCondition"
  | "addRow"
  | "addOrGroup"
  | "columnTitle"
  | "configureColumns"
  | "filterColumn"
  | "filterOperator"
  | "filterValue"
  | "goToPage"
  | "isEmpty"
  | "isNotEmpty"
  | "nextPage"
  | "noRowsToDisplay"
  | "of"
  | "page"
  | "pinColumn"
  | "pinRow"
  | "previousPage"
  | "removeColumn"
  | "removeRow"
  | "removeFilter"
  | "searchPlaceholder"
  | "sortAscending"
  | "sortDescending"
  | "tableStructure"
  | "unpinRow"
  | "value";

export type TableFieldTranslations = Partial<
  Record<TableFieldTranslationKey, string>
>;

export type TableFieldTranslationsByLocale = Record<
  string,
  TableFieldTranslations
>;

export type TableFieldColumnConfig = {
  enableSorting?: boolean;
  inputType?: string;
  key: string;
  label?: TableFieldLocalizedString;
  name?: TableFieldLocalizedString;
  placeholder?: TableFieldLocalizedString;
  readOnly?: boolean;
};

export type TableFieldValueObject = {
  columns: TableFieldColumnConfig[];
  rows: TableFieldRow[];
};

export type TableFieldValue = TableFieldRow[] | TableFieldValueObject;

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

const normalizeLocalizedString = (
  value: unknown
): TableFieldLocalizedString | undefined => {
  if (typeof value === "string") {
    return value;
  }

  if (!isPlainObject(value)) {
    return undefined;
  }

  const localizedEntries = Object.entries(value).filter(
    ([, localizedValue]) => {
      return typeof localizedValue === "string" && localizedValue.length > 0;
    }
  );

  if (localizedEntries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(localizedEntries) as Record<string, string>;
};

const normalizeRow = (value: unknown): TableFieldRow => {
  if (isPlainObject(value)) {
    return value as TableFieldRow;
  }

  return {};
};

const normalizeRows = (value: unknown): TableFieldRow[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(normalizeRow);
};

const normalizeColumn = (value: unknown): TableFieldColumnConfig | null => {
  if (
    !isPlainObject(value) ||
    typeof value.key !== "string" ||
    value.key.trim().length === 0
  ) {
    return null;
  }

  return {
    enableSorting:
      typeof value.enableSorting === "boolean"
        ? value.enableSorting
        : undefined,
    inputType:
      typeof value.inputType === "string" ? value.inputType : undefined,
    key: value.key,
    label: normalizeLocalizedString(value.label),
    name: normalizeLocalizedString(value.name),
    placeholder: normalizeLocalizedString(value.placeholder),
    readOnly: typeof value.readOnly === "boolean" ? value.readOnly : undefined,
  };
};

const normalizeColumns = (value: unknown): TableFieldColumnConfig[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeColumn)
    .filter((column): column is TableFieldColumnConfig => column !== null);
};

export const isTableFieldValueObject = (
  value: unknown
): value is TableFieldValueObject => {
  if (!isPlainObject(value)) {
    return false;
  }

  return Array.isArray(value.columns) && Array.isArray(value.rows);
};

export const getTableFieldRows = (value: unknown): TableFieldRow[] => {
  if (isTableFieldValueObject(value)) {
    return normalizeRows(value.rows);
  }

  return normalizeRows(value);
};

export const getTableFieldColumns = (
  value: unknown,
  fallbackColumns: TableFieldColumnConfig[]
): TableFieldColumnConfig[] => {
  if (isTableFieldValueObject(value)) {
    const persistedColumns = normalizeColumns(value.columns);

    if (persistedColumns.length > 0) {
      return persistedColumns;
    }
  }

  return fallbackColumns;
};

export const getTableFieldState = (
  value: unknown,
  fallbackColumns: TableFieldColumnConfig[]
) => {
  return {
    columns: getTableFieldColumns(value, fallbackColumns),
    rows: getTableFieldRows(value),
  };
};

export const createTableFieldValue = ({
  columns,
  dynamicColumns,
  rows,
}: {
  columns: TableFieldColumnConfig[];
  dynamicColumns: boolean;
  rows: TableFieldRow[];
}): TableFieldValue => {
  if (!dynamicColumns) {
    return rows;
  }

  return {
    columns,
    rows,
  };
};

export const createBlankTableRow = (
  columns: TableFieldColumnConfig[]
): TableFieldRow => {
  return Object.fromEntries(columns.map((column) => [column.key, ""]));
};

const slugifyColumnKey = (label: string) => {
  const normalizedLabel = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalizedLabel || "column";
};

export const createUniqueColumnKey = (
  label: string,
  existingColumns: TableFieldColumnConfig[]
): string => {
  const existingKeys = new Set(existingColumns.map((column) => column.key));
  const baseKey = slugifyColumnKey(label);

  if (!existingKeys.has(baseKey)) {
    return baseKey;
  }

  let index = existingColumns.length + 1;

  while (existingKeys.has(`${baseKey}_${index}`)) {
    index += 1;
  }

  return `${baseKey}_${index}`;
};

export type TableFieldConfig = {
  columns: TableFieldColumnConfig[];
  debugTable?: boolean;
  dynamicColumns?: boolean;
  editable?: boolean;
  filters?: boolean;
  pagination?: boolean;
  paginationPageIndex?: number;
  paginationPageSize?: number;
  paginationPageSizes?: number[];
  rowPinning?: boolean;
  rowSelection?: boolean;
  translations?: TableFieldTranslationsByLocale;
};

export type TableFieldOptions = Omit<JSONField, "type">;
