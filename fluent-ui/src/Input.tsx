import { Input, type InputProps } from "@fluentui/react-components";
import type { Control } from "@react-typed-forms/core";
import { FField, type FFieldProps } from "./FField";
import { useControlEdit } from "./editState";

export interface CInputProps extends Omit<InputProps, "value" | "onChange"> {
  control: Control<string | null | undefined>;
}

/** Binds a control to a FluentUI `Input`; no label/validation UI. */
export function CInput({ control, ...rest }: CInputProps) {
  const { disabled, readOnly } = useControlEdit(control, true);
  return (
    <Input
      value={control.value ?? ""}
      onChange={(_, data) => {
        control.value = data.value;
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

export interface FInputProps
  extends CInputProps,
    Pick<FFieldProps, "label" | "required" | "hint"> {}

/** {@link CInput} wrapped in {@link FField} for label + validation. */
export function FInput({ control, label, required, hint, ...rest }: FInputProps) {
  return (
    <FField control={control} label={label} required={required} hint={hint}>
      <CInput control={control} {...rest} />
    </FField>
  );
}
