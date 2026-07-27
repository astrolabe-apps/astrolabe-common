import {
  Radio,
  type RadioProps,
  RadioGroup,
  type RadioGroupProps,
} from "@fluentui/react-components";
import type { Control } from "@react-typed-forms/core";
import { FField, type FFieldProps } from "./FField";
import { useControlEdit } from "./editState";
import {
  resolveOptionKey,
  type OptionKeyProp,
  type SelectBaseProps,
  type SelectOption,
} from "./select";

export type CRadioGroupProps<T> = Omit<
  RadioGroupProps,
  "value" | "onChange" | "children"
> &
  SelectBaseProps<T> & {
    control: Control<T | null | undefined>;
  } & OptionKeyProp<T>;

/**
 * Binds a control to a FluentUI `RadioGroup` (always single-select). `options`
 * carry arbitrary `T` values, with per-option `disabled` and `content`; the
 * `group` field is ignored (radios have no `OptionGroup`). No label/validation
 * UI. A read-only edit state locks the group via `disabled`.
 */
export function CRadioGroup<T>(props: CRadioGroupProps<T>) {
  const { options, control, getOptionKey, ...rest } = props as CRadioGroupProps<T> & {
    control: Control<T | null | undefined>;
    getOptionKey?: (value: T) => string;
  };
  const getKey = resolveOptionKey(getOptionKey);
  const { disabled } = useControlEdit(control, false);
  const byKey = new Map<string, SelectOption<T>>();
  options.forEach((o) => byKey.set(getKey(o.value), o));
  const value = control.value == null ? "" : getKey(control.value);
  return (
    <RadioGroup
      value={value}
      onChange={(_, data) => {
        control.value = byKey.get(data.value)?.value ?? null;
      }}
      disabled={disabled}
      {...rest}
    >
      {options.map((o) => {
        const key = getKey(o.value);
        // Only set `disabled` when the option itself is disabled — passing
        // `disabled={undefined}` suppresses the RadioGroup's disabled cascade
        // (and therefore FormEditState), so omit the prop otherwise.
        return (
          <Radio
            key={key}
            value={key}
            label={(o.content ?? o.text) as RadioProps["label"]}
            {...(o.disabled ? { disabled: true } : {})}
          />
        );
      })}
    </RadioGroup>
  );
}

export type FRadioGroupProps<T> = CRadioGroupProps<T> &
  Pick<FFieldProps, "label" | "required" | "hint">;

/** {@link CRadioGroup} wrapped in {@link FField} for label + validation. */
export function FRadioGroup<T>(props: FRadioGroupProps<T>) {
  const { label, required, hint, ...rest } = props;
  const control = (rest as { control: Control<unknown> }).control;
  return (
    <FField control={control} label={label} required={required} hint={hint}>
      <CRadioGroup {...(rest as CRadioGroupProps<T>)} />
    </FField>
  );
}
