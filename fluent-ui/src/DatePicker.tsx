import { Input, type InputProps } from "@fluentui/react-components";
import type { Control } from "@react-typed-forms/core";
import { FField, type FFieldProps } from "./FField";
import { useControlEdit } from "./editState";

export interface CDatePickerProps
  extends Omit<InputProps, "value" | "onChange" | "type"> {
  control: Control<string | null | undefined>;
  /** When true, render the time portion too (datetime-local input). */
  withTime?: boolean;
}

/**
 * Binds a control to a native date / datetime-local `Input`, storing ISO
 * strings on the control; no label/validation UI. Keeps DTOs string-typed for
 * NSwag, no extra date library.
 */
export function CDatePicker({ control, withTime, ...rest }: CDatePickerProps) {
  const { disabled, readOnly } = useControlEdit(control, true);
  const iso = control.value ?? "";
  const inputValue = iso ? toLocalInputValue(iso, !!withTime) : "";
  return (
    <Input
      type={withTime ? "datetime-local" : "date"}
      value={inputValue}
      onChange={(_, data) => {
        if (!data.value) {
          control.value = null;
          return;
        }
        control.value = withTime
          ? new Date(data.value).toISOString()
          : `${data.value}T00:00:00.000Z`;
      }}
      onBlur={() => {
        control.touched = true;
      }}
      {...rest}
      disabled={disabled}
      readOnly={readOnly}
    />
  );
}

export interface FDatePickerProps
  extends CDatePickerProps,
    Pick<FFieldProps, "label" | "required" | "hint"> {}

/** {@link CDatePicker} wrapped in {@link FField} for label + validation. */
export function FDatePicker({
  control,
  label,
  required,
  hint,
  ...rest
}: FDatePickerProps) {
  return (
    <FField control={control} label={label} required={required} hint={hint}>
      <CDatePicker control={control} {...rest} />
    </FField>
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
