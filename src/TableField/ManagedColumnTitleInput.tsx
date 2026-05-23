import type { FC } from "react";

type ManagedColumnTitleInputProps = {
  ariaLabel: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
};

export const ManagedColumnTitleInput: FC<ManagedColumnTitleInputProps> = ({
  ariaLabel,
  onChange,
  placeholder,
  value,
}) => {
  return (
    <input
      aria-label={ariaLabel}
      className="payload-table-field__column-title-input"
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      type="text"
      value={value}
    />
  );
};
