import { Dropdown, Field, Option, type DropdownProps } from "@fluentui/react-components";
import type { Control } from "@react-typed-forms/core";

export interface FDropdownOption<T extends string> {
  value: T;
  label: string;
}

export interface FDropdownProps<T extends string>
  extends Omit<DropdownProps, "value" | "onChange" | "selectedOptions" | "children"> {
  control: Control<T | null | undefined>;
  options: ReadonlyArray<FDropdownOption<T>>;
  label?: string;
  required?: boolean;
  placeholder?: string;
}

export function FDropdown<T extends string>({
  control,
  options,
  label,
  required,
  placeholder,
  ...rest
}: FDropdownProps<T>) {
  const value = control.value ?? null;
  const error = control.touched ? control.error : null;
  const selectedText = options.find((o) => o.value === value)?.label ?? "";
  return (
    <Field
      label={label}
      required={required}
      validationState={error ? "error" : "none"}
      validationMessage={error ?? undefined}
    >
      <Dropdown
        value={selectedText}
        selectedOptions={value ? [value] : []}
        placeholder={placeholder}
        onOptionSelect={(_, data) => {
          control.value = (data.optionValue ?? null) as T | null;
        }}
        onBlur={() => {
          control.touched = true;
        }}
        disabled={control.disabled}
        {...rest}
      >
        {options.map((o) => (
          <Option key={o.value} value={o.value}>
            {o.label}
          </Option>
        ))}
      </Dropdown>
    </Field>
  );
}
