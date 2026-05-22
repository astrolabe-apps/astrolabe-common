import { Field, Textarea, type TextareaProps } from "@fluentui/react-components";
import type { Control } from "@react-typed-forms/core";

export interface FTextareaProps extends Omit<TextareaProps, "value" | "onChange"> {
  control: Control<string | null | undefined>;
  label?: string;
  required?: boolean;
}

export function FTextarea({ control, label, required, ...rest }: FTextareaProps) {
  const value = control.value ?? "";
  const error = control.touched ? control.error : null;
  return (
    <Field
      label={label}
      required={required}
      validationState={error ? "error" : "none"}
      validationMessage={error ?? undefined}
    >
      <Textarea
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
