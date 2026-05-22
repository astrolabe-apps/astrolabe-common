import { Field, Input, type InputProps } from "@fluentui/react-components";
import type { Control } from "@react-typed-forms/core";

export interface FInputProps extends Omit<InputProps, "value" | "onChange"> {
  control: Control<string | null | undefined>;
  label?: string;
  required?: boolean;
  hint?: string;
}

export function FInput({ control, label, required, hint, ...rest }: FInputProps) {
  const value = control.value ?? "";
  const error = control.touched ? control.error : null;
  return (
    <Field
      label={label}
      required={required}
      hint={hint}
      validationState={error ? "error" : "none"}
      validationMessage={error ?? undefined}
    >
      <Input
        value={value}
        onChange={(_, data) => {
          control.value = data.value;
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
