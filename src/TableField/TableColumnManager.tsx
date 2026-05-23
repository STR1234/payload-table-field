import type { TableFieldColumnConfig } from "../types.js";

import { ManagedColumnTitleInput } from "./ManagedColumnTitleInput.js";
import type { TableFieldUIStrings } from "./TableFieldI18n.js";
import { PlusIcon, XIcon } from "./TableIcons.js";

type TableColumnManagerProps = {
  getColumnLabel: (column: TableFieldColumnConfig) => string;
  hasConfiguredColumns: boolean;
  managedColumns: TableFieldColumnConfig[];
  newColumnTitle: string;
  onAddColumn: () => void;
  onNewColumnTitleChange: (value: string) => void;
  onRemoveColumn: (columnKey: string) => void;
  onUpdateColumnTitle: (columnKey: string, nextLabel: string) => void;
  strings: Pick<
    TableFieldUIStrings,
    | "addColumn"
    | "columnTitle"
    | "configureColumns"
    | "removeColumn"
    | "tableStructure"
  >;
};

export const TableColumnManager = ({
  getColumnLabel,
  hasConfiguredColumns,
  managedColumns,
  newColumnTitle,
  onAddColumn,
  onNewColumnTitleChange,
  onRemoveColumn,
  onUpdateColumnTitle,
  strings,
}: TableColumnManagerProps) => {
  return (
    <div className="payload-table-field__column-manager">
      <div className="payload-table-field__column-manager-header">
        <span className="payload-table-field__filters-label">
          {strings.tableStructure}
        </span>
        {!hasConfiguredColumns ? (
          <p className="payload-table-field__column-manager-empty">
            {strings.configureColumns}
          </p>
        ) : null}
      </div>

      {hasConfiguredColumns ? (
        <div className="payload-table-field__column-manager-list">
          {managedColumns.map((column) => {
            const columnLabel = getColumnLabel(column);

            return (
              <div
                className="payload-table-field__column-manager-row"
                key={column.key}
              >
                <ManagedColumnTitleInput
                  ariaLabel={`${strings.columnTitle}: ${columnLabel}`}
                  onChange={(nextValue) =>
                    onUpdateColumnTitle(column.key, nextValue)
                  }
                  placeholder={strings.columnTitle}
                  value={columnLabel}
                />
                <span className="payload-table-field__column-key">
                  {column.key}
                </span>
                <button
                  aria-label={`${strings.removeColumn}: ${columnLabel}`}
                  className="payload-table-field__pill payload-table-field__pill--danger"
                  onClick={() => onRemoveColumn(column.key)}
                  type="button"
                >
                  <XIcon size={12} />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="payload-table-field__column-manager-add">
        <ManagedColumnTitleInput
          ariaLabel={strings.columnTitle}
          onChange={onNewColumnTitleChange}
          placeholder={strings.columnTitle}
          value={newColumnTitle}
        />
        <button
          className="payload-table-field__button payload-table-field__button--primary"
          disabled={!newColumnTitle.trim()}
          onClick={onAddColumn}
          type="button"
        >
          <span className="payload-table-field__button-label">
            <PlusIcon size={14} />
            {strings.addColumn}
          </span>
        </button>
      </div>
    </div>
  );
};
