import { useEffect, useState, type FC } from "react";

const formatCellValue = (value: unknown): string => {
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

type EditableCellProps = {
  ariaLabel: string;
  columnId: string;
  inputType?: string;
  isReadOnly: boolean;
  onCommit: (value: string) => void;
  placeholder?: string;
  value: unknown;
};

export const EditableCell: FC<EditableCellProps> = ({
  ariaLabel,
  columnId,
  inputType,
  isReadOnly,
  onCommit,
  placeholder,
  value,
}) => {
  const formattedValue = formatCellValue(value);
  const [inputValue, setInputValue] = useState(formattedValue);

  useEffect(() => {
    setInputValue(formattedValue);
  }, [formattedValue]);

  if (isReadOnly) {
    return <span>{formattedValue}</span>;
  }

  const handleBlur = () => {
    onCommit(inputValue);
  };

  return (
    <input
      aria-label={ariaLabel || columnId}
      className="payload-table-field__cell-input"
      onBlur={handleBlur}
      onChange={(event) => setInputValue(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
      placeholder={placeholder}
      type={inputType ?? "text"}
      value={inputValue}
    />
  );
};
