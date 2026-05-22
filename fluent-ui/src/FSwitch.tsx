import { Field, Switch, type SwitchProps } from "@fluentui/react-components";
import type { Control } from "@react-typed-forms/core";

export interface FSwitchProps extends Omit<SwitchProps, "checked" | "onChange"> {
  control: Control<boolean | null | undefined>;
  label?: string;
}

export function FSwitch({ control, label, ...rest }: FSwitchProps) {
  return (
    <Field label={label}>
      <Switch
        checked={!!control.value}
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
