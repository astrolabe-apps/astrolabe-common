import {
  Radio,
  RadioGroup,
  type RadioGroupProps,
} from "@fluentui/react-components";
import type { Control } from "@react-typed-forms/core";
import { FField, type FFieldProps } from "./FField";
import { useControlEdit } from "./editState";

export interface FRadioGroupOption<T extends string> {
  value: T;
  label: string;
}

export interface CRadioGroupProps<T extends string>
  extends Omit<RadioGroupProps, "value" | "onChange" | "children"> {
  control: Control<T | null | undefined>;
  options: ReadonlyArray<FRadioGroupOption<T>>;
}

/**
 * Binds a control to a FluentUI `RadioGroup`; no label/validation UI. A
 * read-only edit state locks the group via `disabled`.
 */
export function CRadioGroup<T extends string>({
  control,
  options,
  ...rest
}: CRadioGroupProps<T>) {
  const { disabled } = useControlEdit(control, false);
  return (
    <RadioGroup
      value={control.value ?? ""}
      onChange={(_, data) => {
        control.value = (data.value as T) ?? null;
      }}
      {...rest}
      disabled={disabled}
    >
      {options.map((o) => (
        <Radio key={o.value} value={o.value} label={o.label} />
      ))}
    </RadioGroup>
  );
}

export interface FRadioGroupProps<T extends string>
  extends CRadioGroupProps<T>,
    Pick<FFieldProps, "label" | "required" | "hint"> {}

/** {@link CRadioGroup} wrapped in {@link FField} for label + validation. */
export function FRadioGroup<T extends string>({
  control,
  options,
  label,
  required,
  hint,
  ...rest
}: FRadioGroupProps<T>) {
  return (
    <FField control={control} label={label} required={required} hint={hint}>
      <CRadioGroup control={control} options={options} {...rest} />
    </FField>
  );
}
