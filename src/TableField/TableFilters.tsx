import type { TableFieldColumnConfig } from "../types.js";
import type { TableFieldUIStrings } from "./TableFieldI18n.js";
import { PlusIcon, XIcon } from "./TableIcons.js";

const tableFilterOperators = [
  "contains",
  "equals",
  "notEquals",
  "greaterThan",
  "greaterThanOrEqual",
  "lessThan",
  "lessThanOrEqual",
  "isEmpty",
  "isNotEmpty",
] as const;

let tableFilterId = 0;

const createFilterId = () => {
  tableFilterId += 1;

  return `payload-table-field-filter-${tableFilterId}`;
};

const formatFilterValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }

  if (
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
};

const isEmptyValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim().length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return false;
};

const compareValues = (left: unknown, right: string) => {
  const leftValue = formatFilterValue(left).trim();
  const rightValue = right.trim();

  const leftNumber = Number(leftValue);
  const rightNumber = Number(rightValue);

  if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)) {
    return leftNumber - rightNumber;
  }

  return leftValue.localeCompare(rightValue, undefined, {
    sensitivity: "base",
  });
};

export type TableFilterOperator = (typeof tableFilterOperators)[number];

export type TableFilterCondition = {
  columnKey: string;
  id: string;
  operator: TableFilterOperator;
  value: string;
};

export type TableFilterGroup = {
  and: TableFilterCondition[];
  id: string;
};

export const createDefaultFilterCondition = (
  columns: TableFieldColumnConfig[]
): TableFilterCondition => ({
  columnKey: columns[0]?.key ?? "",
  id: createFilterId(),
  operator: "contains",
  value: "",
});

export const createDefaultFilterGroup = (
  columns: TableFieldColumnConfig[]
): TableFilterGroup => ({
  and: [createDefaultFilterCondition(columns)],
  id: createFilterId(),
});

const operatorNeedsValue = (operator: TableFilterOperator) => {
  return operator !== "isEmpty" && operator !== "isNotEmpty";
};

const matchesFilterCondition = <TRow extends Record<string, unknown>>(
  row: TRow,
  condition: TableFilterCondition
) => {
  if (!condition.columnKey) {
    return true;
  }

  const rowValue = row[condition.columnKey];
  const normalizedRowValue = formatFilterValue(rowValue);
  const normalizedFilterValue = condition.value.trim();

  switch (condition.operator) {
    case "contains":
      return normalizedRowValue
        .toLowerCase()
        .includes(normalizedFilterValue.toLowerCase());
    case "equals":
      return compareValues(rowValue, normalizedFilterValue) === 0;
    case "notEquals":
      return compareValues(rowValue, normalizedFilterValue) !== 0;
    case "greaterThan":
      return compareValues(rowValue, normalizedFilterValue) > 0;
    case "greaterThanOrEqual":
      return compareValues(rowValue, normalizedFilterValue) >= 0;
    case "lessThan":
      return compareValues(rowValue, normalizedFilterValue) < 0;
    case "lessThanOrEqual":
      return compareValues(rowValue, normalizedFilterValue) <= 0;
    case "isEmpty":
      return isEmptyValue(rowValue);
    case "isNotEmpty":
      return !isEmptyValue(rowValue);
    default:
      return true;
  }
};

export const applyTableFilterGroups = <TRow extends Record<string, unknown>>(
  rows: TRow[],
  groups: TableFilterGroup[]
) => {
  if (groups.length === 0) {
    return rows;
  }

  return rows.filter((row) =>
    groups.some((group) =>
      group.and.every((condition) => matchesFilterCondition(row, condition))
    )
  );
};

interface TableFiltersProps {
  columns: TableFieldColumnConfig[];
  groups: TableFilterGroup[];
  onChange: (groups: TableFilterGroup[]) => void;
  resolveColumnLabel: (column: TableFieldColumnConfig) => string;
  strings: TableFieldUIStrings;
}

export function TableFilters({
  columns,
  groups,
  onChange,
  resolveColumnLabel,
  strings,
}: TableFiltersProps) {
  if (columns.length === 0) {
    return null;
  }

  const operatorOptions: Array<{ label: string; value: TableFilterOperator }> =
    [
      { label: strings.operators.contains, value: "contains" },
      { label: strings.operators.equals, value: "equals" },
      { label: strings.operators.notEquals, value: "notEquals" },
      { label: strings.operators.greaterThan, value: "greaterThan" },
      {
        label: strings.operators.greaterThanOrEqual,
        value: "greaterThanOrEqual",
      },
      { label: strings.operators.lessThan, value: "lessThan" },
      { label: strings.operators.lessThanOrEqual, value: "lessThanOrEqual" },
      { label: strings.isEmpty, value: "isEmpty" },
      { label: strings.isNotEmpty, value: "isNotEmpty" },
    ];

  const updateCondition = (
    groupId: string,
    conditionId: string,
    nextCondition: Partial<TableFilterCondition>
  ) => {
    onChange(
      groups.map((group) => {
        if (group.id !== groupId) {
          return group;
        }

        return {
          ...group,
          and: group.and.map((condition) => {
            if (condition.id !== conditionId) {
              return condition;
            }

            return {
              ...condition,
              ...nextCondition,
              value:
                nextCondition.operator &&
                !operatorNeedsValue(nextCondition.operator)
                  ? ""
                  : nextCondition.value ?? condition.value,
            };
          }),
        };
      })
    );
  };

  const addCondition = (groupId: string) => {
    onChange(
      groups.map((group) => {
        if (group.id !== groupId) {
          return group;
        }

        return {
          ...group,
          and: [...group.and, createDefaultFilterCondition(columns)],
        };
      })
    );
  };

  const removeCondition = (groupId: string, conditionId: string) => {
    const nextGroups = groups
      .map((group) => {
        if (group.id !== groupId) {
          return group;
        }

        return {
          ...group,
          and: group.and.filter((condition) => condition.id !== conditionId),
        };
      })
      .filter((group) => group.and.length > 0);

    onChange(nextGroups);
  };

  const addOrGroup = () => {
    onChange([...groups, createDefaultFilterGroup(columns)]);
  };

  if (groups.length === 0) {
    return (
      <div className="payload-table-field__filters-empty">
        <div className="payload-table-field__filters-label">
          {strings.noFiltersSet}
        </div>

        <button
          className="payload-table-field__button payload-table-field__button--inline"
          onClick={() => onChange([createDefaultFilterGroup(columns)])}
          type="button"
        >
          <PlusIcon size={14} />
          <span className="payload-table-field__button-label">
            {strings.addFilter}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="payload-table-field__filters">
      <div className="payload-table-field__filters-label">
        {strings.filterWhere}
      </div>

      <div className="payload-table-field__filters-groups">
        {groups.map((group, groupIndex) => (
          <div
            className="payload-table-field__filter-group-wrap"
            key={group.id}
          >
            {groupIndex > 0 ? (
              <div className="payload-table-field__filter-connector">
                {strings.or}
              </div>
            ) : null}

            <div className="payload-table-field__filter-group">
              {group.and.map((condition, conditionIndex) => (
                <div
                  className="payload-table-field__filter-row"
                  key={condition.id}
                >
                  {conditionIndex > 0 ? (
                    <div className="payload-table-field__filter-connector payload-table-field__filter-connector--inline">
                      {strings.and}
                    </div>
                  ) : null}

                  <div className="payload-table-field__filter-controls">
                    <select
                      aria-label={strings.filterColumn}
                      className="payload-table-field__filter-select"
                      onChange={(event) =>
                        updateCondition(group.id, condition.id, {
                          columnKey: event.target.value,
                        })
                      }
                      value={condition.columnKey}
                    >
                      {columns.map((column) => (
                        <option key={column.key} value={column.key}>
                          {resolveColumnLabel(column)}
                        </option>
                      ))}
                    </select>

                    <select
                      aria-label={strings.filterOperator}
                      className="payload-table-field__filter-select"
                      onChange={(event) =>
                        updateCondition(group.id, condition.id, {
                          operator: event.target.value as TableFilterOperator,
                        })
                      }
                      value={condition.operator}
                    >
                      {operatorOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    {operatorNeedsValue(condition.operator) ? (
                      <input
                        aria-label={strings.filterValue}
                        className="payload-table-field__filter-input"
                        onChange={(event) =>
                          updateCondition(group.id, condition.id, {
                            value: event.target.value,
                          })
                        }
                        placeholder={strings.value}
                        type="text"
                        value={condition.value}
                      />
                    ) : null}

                    <button
                      aria-label={strings.removeFilter}
                      className="payload-table-field__clickable-arrow payload-table-field__filter-remove"
                      onClick={() => removeCondition(group.id, condition.id)}
                      type="button"
                    >
                      <XIcon size={14} />
                    </button>
                  </div>
                </div>
              ))}

              <div className="payload-table-field__filter-actions">
                <button
                  className="payload-table-field__button payload-table-field__button--inline"
                  onClick={() => addCondition(group.id)}
                  type="button"
                >
                  <PlusIcon size={14} />
                  <span className="payload-table-field__button-label">
                    {strings.addCondition}
                  </span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="payload-table-field__filter-actions">
        <button
          className="payload-table-field__button payload-table-field__button--inline"
          onClick={addOrGroup}
          type="button"
        >
          <PlusIcon size={14} />
          <span className="payload-table-field__button-label">
            {strings.addOrGroup}
          </span>
        </button>
      </div>
    </div>
  );
}
