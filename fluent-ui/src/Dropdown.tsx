import {
  Dropdown,
  Option,
  type DropdownProps,
} from "@fluentui/react-components";
import type { Control } from "@react-typed-forms/core";
import { FField, type FFieldProps } from "./FField";
import { useControlEdit } from "./editState";

export interface FDropdownOption<T extends string> {
  value: T;
  label: string;
}

export interface CDropdownProps<T extends string>
  extends Omit<
    DropdownProps,
    "value" | "onChange" | "selectedOptions" | "children"
  > {
  control: Control<T | null | undefined>;
  options: ReadonlyArray<FDropdownOption<T>>;
}

/**
 * Binds a control to a FluentUI `Dropdown`; no label/validation UI. A read-only
 * edit state locks the dropdown via `disabled`.
 */
export function CDropdown<T extends string>({
  control,
  options,
  ...rest
}: CDropdownProps<T>) {
  const { disabled } = useControlEdit(control, false);
  const value = control.value ?? null;
  const selectedText = options.find((o) => o.value === value)?.label ?? "";
  return (
    <Dropdown
      value={selectedText}
      selectedOptions={value ? [value] : []}
      onOptionSelect={(_, data) => {
        control.value = (data.optionValue ?? null) as T | null;
      }}
      onBlur={() => {
        control.touched = true;
      }}
      {...rest}
      disabled={disabled}
    >
      {options.map((o) => (
        <Option key={o.value} value={o.value}>
          {o.label}
        </Option>
      ))}
    </Dropdown>
  );
}

export interface FDropdownProps<T extends string>
  extends CDropdownProps<T>,
    Pick<FFieldProps, "label" | "required" | "hint"> {}

/** {@link CDropdown} wrapped in {@link FField} for label + validation. */
export function FDropdown<T extends string>({
  control,
  options,
  label,
  required,
  hint,
  ...rest
}: FDropdownProps<T>) {
  return (
    <FField control={control} label={label} required={required} hint={hint}>
      <CDropdown control={control} options={options} {...rest} />
    </FField>
  );
}
