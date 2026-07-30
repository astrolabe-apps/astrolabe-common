import { SpinButton, type SpinButtonProps } from "@fluentui/react-components";
import type { Control } from "@react-typed-forms/core";
import { FField, type FFieldProps } from "./FField";
import { useControlEdit } from "./editState";

export interface CSpinButtonProps
  extends Omit<SpinButtonProps, "value" | "onChange"> {
  control: Control<number | null | undefined>;
}

/** Binds a control to a FluentUI `SpinButton`; no label/validation UI. */
export function CSpinButton({ control, ...rest }: CSpinButtonProps) {
  const { disabled, readOnly } = useControlEdit(control, true);
  return (
    <SpinButton
      value={control.value ?? null}
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
      disabled={disabled}
      readOnly={readOnly}
      {...rest}
    />
  );
}

export interface FSpinButtonProps
  extends CSpinButtonProps,
    Pick<FFieldProps, "label" | "required" | "hint"> {}

/** {@link CSpinButton} wrapped in {@link FField} for label + validation. */
export function FSpinButton({
  control,
  label,
  required,
  hint,
  ...rest
}: FSpinButtonProps) {
  return (
    <FField control={control} label={label} required={required} hint={hint}>
      <CSpinButton control={control} {...rest} />
    </FField>
  );
}
