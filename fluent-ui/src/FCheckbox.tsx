import { Checkbox, type CheckboxProps, Field } from "@fluentui/react-components";
import type { Control } from "@react-typed-forms/core";

export interface FCheckboxProps extends Omit<CheckboxProps, "checked" | "onChange"> {
  control: Control<boolean | null | undefined>;
  label?: string;
}

export function FCheckbox({ control, label, ...rest }: FCheckboxProps) {
  return (
    <Field>
      <Checkbox
        checked={!!control.value}
        label={label}
        onChange={(_, data) => {
          control.value = !!data.checked;
        }}
        onBlur={() => {
          control.touched = true;
        }}
        disabled={control.disabled}
        {...rest}
      />
    </Field>
  );
}
