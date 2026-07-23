import { Checkbox, type CheckboxProps } from "@fluentui/react-components";
import type { Control } from "@react-typed-forms/core";
import { FField } from "./FField";
import { useControlEdit } from "./editState";

export interface CCheckboxProps
  extends Omit<CheckboxProps, "checked" | "onChange"> {
  control: Control<boolean | null | undefined>;
}

/**
 * Binds a control to a FluentUI `Checkbox` (its own `label` prop still applies);
 * no validation UI. Native checkboxes have no read-only, so a read-only edit
 * state locks the box via `disabled`.
 */
export function CCheckbox({ control, ...rest }: CCheckboxProps) {
  const { disabled } = useControlEdit(control, false);
  return (
    <Checkbox
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

export interface FCheckboxProps extends CCheckboxProps {}

/** {@link CCheckbox} wrapped in {@link FField} for validation display. */
export function FCheckbox({ control, ...rest }: FCheckboxProps) {
  return (
    <FField control={control}>
      <CCheckbox control={control} {...rest} />
    </FField>
  );
}
