import { Combobox, type ComboboxProps } from "@fluentui/react-components";
import { type Control, useControl } from "@react-typed-forms/core";
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

/** `freeform` (accept typed values not in the list) only makes sense for string values. */
export type ComboboxFreeformProp<T> = [T] extends [string]
  ? { freeform?: boolean }
  : { freeform?: never };

export type CComboboxProps<T> = Omit<
  ComboboxProps,
  | "value"
  | "selectedOptions"
  | "defaultSelectedOptions"
  | "onOptionSelect"
  | "children"
  | "multiselect"
  | "freeform"
  | "onChange"
> &
  SelectBaseProps<T> &
  SelectControl<T> &
  OptionKeyProp<T> &
  ComboboxFreeformProp<T>;

/**
 * Binds a control to a FluentUI `Combobox` — an editable, searchable select.
 * Unlike `Dropdown`, typing filters the options (case-insensitive on `text`).
 * `options` carry arbitrary `T`; single-select stores `T | null`, multiselect
 * stores `T[]`. `freeform` (string values only) keeps text that isn't an option.
 */
export function CCombobox<T>(props: CComboboxProps<T>) {
  const {
    options,
    control,
    multiselect,
    getOptionKey,
    freeform,
    ...rest
  } = props as CComboboxProps<T> & {
    control: Control<any>;
    getOptionKey?: (value: T) => string;
    freeform?: boolean;
  };
  const getKey = resolveOptionKey(getOptionKey);
  const { disabled } = useControlEdit(control, false);
  const { selectedOptions, selectedText, onOptionSelect } = useSelectBinding<T>(
    options,
    control,
    getKey,
    !!multiselect,
  );

  // `undefined` = not actively typing → show the selection, list unfiltered.
  const query = useControl<string | undefined>(undefined);
  const typing = query.value;
  // A freeform value won't match an option (so `selectedText` is empty); fall
  // back to the raw control value so typed-in text stays visible.
  const freeformText =
    freeform && !multiselect && typeof control.value === "string"
      ? control.value
      : "";
  const displayText = selectedText || freeformText;
  // `typing` is only set while the user is actively editing, so filter whenever
  // it is present.
  const filtered =
    typing == null
      ? options
      : options.filter((o) =>
          o.text.toLowerCase().includes(typing.toLowerCase()),
        );
  // When not typing, show the selection — for multiselect this is the
  // comma-joined selection (the "value string" pattern from the docs).
  const inputValue = typing ?? displayText;

  return (
    <Combobox
      multiselect={!!multiselect}
      freeform={freeform}
      value={inputValue}
      selectedOptions={selectedOptions}
      onOptionSelect={(e, data) => {
        onOptionSelect(e, data);
        query.value = undefined;
      }}
      onChange={(e) => {
        const v = e.target.value;
        query.value = v;
        // Freeform commits live as the user types; other modes commit only on
        // option select.
        if (freeform && !multiselect) control.value = v === "" ? null : v;
      }}
      onBlur={() => {
        control.touched = true;
        query.value = undefined;
      }}
      disabled={disabled}
      {...rest}
    >
      {renderSelectOptions(filtered, getKey)}
    </Combobox>
  );
}

export type FComboboxProps<T> = CComboboxProps<T> &
  Pick<FFieldProps, "label" | "required" | "hint">;

/** {@link CCombobox} wrapped in {@link FField} for label + validation. */
export function FCombobox<T>(props: FComboboxProps<T>) {
  const { label, required, hint, ...rest } = props;
  const control = (rest as { control: Control<unknown> }).control;
  return (
    <FField control={control} label={label} required={required} hint={hint}>
      <CCombobox {...(rest as CComboboxProps<T>)} />
    </FField>
  );
}
