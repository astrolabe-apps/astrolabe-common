import { Switch, type SwitchProps } from "@fluentui/react-components";
import type { Control } from "@react-typed-forms/core";
import { FField, type FFieldProps } from "./FField";
import { useControlEdit } from "./editState";

export interface CSwitchProps
  extends Omit<SwitchProps, "checked" | "onChange"> {
  control: Control<boolean | null | undefined>;
}

/**
 * Binds a control to a FluentUI `Switch`; no label/validation UI. A read-only
 * edit state locks the switch via `disabled`.
 */
export function CSwitch({ control, ...rest }: CSwitchProps) {
  const { disabled } = useControlEdit(control, false);
  return (
    <Switch
      checked={!!control.value}
      onChange={(_, data) => {
        control.value = !!data.checked;
      }}
      onBlur={() => {
        control.touched = true;
      }}
      {...rest}
      disabled={disabled}
    />
  );
}

export interface FSwitchProps
  extends CSwitchProps,
    Pick<FFieldProps, "label" | "required" | "hint"> {}

/** {@link CSwitch} wrapped in {@link FField} for label + validation. */
export function FSwitch({
  control,
  label,
  required,
  hint,
  ...rest
}: FSwitchProps) {
  return (
    <FField control={control} label={label} required={required} hint={hint}>
      <CSwitch control={control} {...rest} />
    </FField>
  );
}
