import { Field, Input, type InputProps } from "@fluentui/react-components";
import type { Control } from "@react-typed-forms/core";

export interface FDatePickerProps extends Omit<InputProps, "value" | "onChange" | "type"> {
  control: Control<string | null | undefined>;
  label?: string;
  required?: boolean;
  /** When true, render the time portion too (datetime-local input). */
  withTime?: boolean;
}

/**
 * Stores ISO strings on the Control. Renders the native date / datetime-local input
 * via FluentUI's Input — keeps DTOs string-typed for NSwag, no extra date library.
 */
export function FDatePicker({ control, label, required, withTime, ...rest }: FDatePickerProps) {
  const iso = control.value ?? "";
  const inputValue = iso ? toLocalInputValue(iso, !!withTime) : "";
  const error = control.touched ? control.error : null;
  return (
    <Field
      label={label}
      required={required}
      validationState={error ? "error" : "none"}
      validationMessage={error ?? undefined}
    >
      <Input
        type={withTime ? "datetime-local" : "date"}
        value={inputValue}
        onChange={(_, data) => {
          if (!data.value) {
            control.value = null;
            return;
          }
          control.value = withTime ? new Date(data.value).toISOString() : `${data.value}T00:00:00.000Z`;
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

function toLocalInputValue(iso: string, withTime: boolean): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (!withTime) return date;
  return `${date}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
