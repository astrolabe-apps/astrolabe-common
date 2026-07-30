import { Dropdown, type DropdownProps } from "@fluentui/react-components";
import type { Control } from "@react-typed-forms/core";
import { FField, type FFieldProps } from "./FField";
import { useControlEdit } from "./editState";
import {
  renderSelectOptions,
  resolveOptionKey,
  useSelectBinding,
  type OptionKeyProp,
  type SelectBaseProps,
  type SelectControl,
} from "./select";

export type CDropdownProps<T> = Omit<
  DropdownProps,
  | "value"
  | "selectedOptions"
  | "defaultSelectedOptions"
  | "onOptionSelect"
  | "children"
  | "multiselect"
> &
  SelectBaseProps<T> &
  SelectControl<T> &
  OptionKeyProp<T>;

/**
 * Binds a control to a FluentUI `Dropdown`. `options` carry arbitrary `T`
 * values; single-select stores `T | null`, multiselect (`multiselect`) stores
 * `T[]`. No label/validation UI. A read-only edit state locks it via `disabled`.
 */
export function CDropdown<T>(props: CDropdownProps<T>) {
  const {
    options,
    control,
    multiselect,
    getOptionKey,
    ...rest
  } = props as CDropdownProps<T> & {
    control: Control<any>;
    getOptionKey?: (value: T) => string;
  };
  const getKey = resolveOptionKey(getOptionKey);
  const { disabled } = useControlEdit(control, false);
  const { selectedOptions, selectedText, onOptionSelect } = useSelectBinding<T>(
    options,
    control,
    getKey,
    !!multiselect,
  );
  return (
    <Dropdown
      multiselect={!!multiselect}
      value={selectedText}
      selectedOptions={selectedOptions}
      onOptionSelect={onOptionSelect}
      onBlur={() => {
        control.touched = true;
      }}
      disabled={disabled}
      {...rest}
    >
      {renderSelectOptions(options, getKey)}
    </Dropdown>
  );
}

export type FDropdownProps<T> = CDropdownProps<T> &
  Pick<FFieldProps, "label" | "required" | "hint">;

/** {@link CDropdown} wrapped in {@link FField} for label + validation. */
export function FDropdown<T>(props: FDropdownProps<T>) {
  const { label, required, hint, ...rest } = props;
  const control = (rest as { control: Control<unknown> }).control;
  return (
    <FField control={control} label={label} required={required} hint={hint}>
      <CDropdown {...(rest as CDropdownProps<T>)} />
    </FField>
  );
}
