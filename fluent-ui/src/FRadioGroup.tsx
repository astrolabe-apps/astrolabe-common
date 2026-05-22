import { Field, Radio, RadioGroup, type RadioGroupProps } from "@fluentui/react-components";
import type { Control } from "@react-typed-forms/core";

export interface FRadioGroupOption<T extends string> {
  value: T;
  label: string;
}

export interface FRadioGroupProps<T extends string>
  extends Omit<RadioGroupProps, "value" | "onChange" | "children"> {
  control: Control<T | null | undefined>;
  options: ReadonlyArray<FRadioGroupOption<T>>;
  label?: string;
  required?: boolean;
}

export function FRadioGroup<T extends string>({
  control,
  options,
  label,
  required,
  ...rest
}: FRadioGroupProps<T>) {
  const value = control.value ?? "";
  const error = control.touched ? control.error : null;
  return (
    <Field
      label={label}
      required={required}
      validationState={error ? "error" : "none"}
      validationMessage={error ?? undefined}
    >
      <RadioGroup
        value={value}
        onChange={(_, data) => {
          control.value = (data.value as T) ?? null;
        }}
        disabled={control.disabled}
        {...rest}
      >
        {options.map((o) => (
          <Radio key={o.value} value={o.value} label={o.label} />
        ))}
      </RadioGroup>
    </Field>
  );
}
