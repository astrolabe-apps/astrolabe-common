import { Field, SpinButton, type SpinButtonProps } from "@fluentui/react-components";
import type { Control } from "@react-typed-forms/core";

export interface FNumberInputProps extends Omit<SpinButtonProps, "value" | "onChange"> {
  control: Control<number | null | undefined>;
  label?: string;
  required?: boolean;
}

export function FNumberInput({ control, label, required, ...rest }: FNumberInputProps) {
  const value = control.value ?? null;
  const error = control.touched ? control.error : null;
  return (
    <Field
      label={label}
      required={required}
      validationState={error ? "error" : "none"}
      validationMessage={error ?? undefined}
    >
      <SpinButton
        value={value}
        onChange={(_, data) => {
          if (data.value !== undefined) control.value = data.value;
          else if (data.displayValue !== undefined) {
            const n = Number(data.displayValue);
            control.value = Number.isFinite(n) ? n : null;
          }
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
