import {
  Option,
  OptionGroup,
  type OptionOnSelectData,
  type SelectionEvents,
} from "@fluentui/react-components";
import type { Control } from "@react-typed-forms/core";
import { Fragment, type ReactElement, type ReactNode } from "react";

/** A single selectable option, bound to an arbitrary value `T`. */
export interface SelectOption<T> {
  /** The real value stored on the control when this option is selected. */
  value: T;
  /** Display + type-ahead/search string (required by FluentUI). */
  text: string;
  /** Optional rich cell content (icon, etc.); defaults to `text`. */
  content?: ReactNode;
  disabled?: boolean;
  /** Optional group label — options sharing one render inside an `OptionGroup`. */
  group?: string;
}

/**
 * `getOptionKey` maps a value to the string id FluentUI needs. It is optional
 * when `T` is already a string, and required otherwise.
 */
export type OptionKeyProp<T> = [T] extends [string]
  ? { getOptionKey?: (value: T) => string }
  : { getOptionKey: (value: T) => string };

export interface SelectBaseProps<T> {
  options: ReadonlyArray<SelectOption<T>>;
}

/** Single-select binds `Control<T | null>`; multiselect binds `Control<T[]>`. */
export type SelectControl<T> =
  | { multiselect?: false; control: Control<T | null | undefined> }
  | { multiselect: true; control: Control<T[]> };

export function resolveOptionKey<T>(
  getOptionKey: ((value: T) => string) | undefined,
): (value: T) => string {
  return getOptionKey ?? ((value: T) => String(value));
}

/**
 * The controlled-selection props shared by `Dropdown` and `Combobox`. Reads and
 * writes the bound control; single-select stores one value, multiselect an array.
 */
export function useSelectBinding<T>(
  options: ReadonlyArray<SelectOption<T>>,
  control: Control<any>,
  getKey: (value: T) => string,
  multiselect: boolean,
): {
  selectedOptions: string[];
  selectedText: string;
  onOptionSelect: (e: SelectionEvents, data: OptionOnSelectData) => void;
} {
  const byKey = new Map<string, SelectOption<T>>();
  options.forEach((o) => byKey.set(getKey(o.value), o));

  let selectedOptions: string[];
  let selectedText: string;
  if (multiselect) {
    const values: T[] = control.value ?? [];
    // Only report keys that correspond to a real option — a phantom selection
    // (e.g. a Combobox freeform value) confuses FluentUI's reconciliation.
    selectedOptions = values.map(getKey).filter((k) => byKey.has(k));
    selectedText = selectedOptions
      .map((k) => byKey.get(k)?.text ?? "")
      .filter(Boolean)
      .join(", ");
  } else {
    const value = control.value as T | null | undefined;
    const key = value == null ? undefined : getKey(value);
    selectedOptions = key != null && byKey.has(key) ? [key] : [];
    selectedText = key != null ? byKey.get(key)?.text ?? "" : "";
  }

  return {
    selectedOptions,
    selectedText,
    onOptionSelect: (_e, data) => {
      if (multiselect) {
        control.value = data.selectedOptions
          .map((k) => byKey.get(k)?.value)
          .filter((v): v is T => v !== undefined);
      } else {
        const k = data.optionValue;
        control.value = k == null ? null : byKey.get(k)?.value ?? null;
      }
    },
  };
}

/** Render the options as `Option`s, clustering any `group`ed ones in `OptionGroup`s. */
export function renderSelectOptions<T>(
  options: ReadonlyArray<SelectOption<T>>,
  getKey: (value: T) => string,
): ReactNode {
  if (!options.some((o) => o.group != null)) {
    return options.map((o) => renderOption(o, getKey));
  }
  // Preserve first-seen group order; ungrouped options keep their own slot.
  const groups: { key: string; label?: string; items: SelectOption<T>[] }[] = [];
  const index = new Map<string, number>();
  options.forEach((o) => {
    const g = o.group ?? "";
    let i = index.get(g);
    if (i == null) {
      i = groups.length;
      index.set(g, i);
      groups.push({ key: g, label: o.group, items: [] });
    }
    groups[i].items.push(o);
  });
  return groups.map((g) =>
    g.label ? (
      <OptionGroup key={"g:" + g.key} label={g.label}>
        {g.items.map((o) => renderOption(o, getKey))}
      </OptionGroup>
    ) : (
      <Fragment key="ungrouped">
        {g.items.map((o) => renderOption(o, getKey))}
      </Fragment>
    ),
  );
}

function renderOption<T>(
  o: SelectOption<T>,
  getKey: (value: T) => string,
): ReactElement {
  const key = getKey(o.value);
  return (
    <Option key={key} value={key} text={o.text} disabled={o.disabled}>
      {o.content ?? o.text}
    </Option>
  );
}
