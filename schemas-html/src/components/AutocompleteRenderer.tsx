import React from "react";
import {
  Control,
  controlValues,
  useControl,
  useControlEffect,
} from "@react-typed-forms/core";
import {
  AutocompleteClasses,
  createDataRenderer,
  DataRenderType,
  FieldOption,
  rendererClass,
} from "@react-typed-forms/schemas";
import { useAutocomplete, UseAutocompleteProps } from "@mui/base";
import clsx from "clsx";

export interface AutocompleteRendererOptions {
  listContainerClass?: string;
  listEntryClass?: string;
}

export function createAutocompleteRenderer(
  options: AutocompleteRendererOptions = {},
) {
  return createDataRenderer(
    (p) => {
      return (
        <Autocomplete
          {...p}
          options={p.options ?? []}
          control={p.control}
          classes={options}
          controlClasses={p.renderOptions as AutocompleteRendererOptions}
        />
      );
    },
    {
      renderType: DataRenderType.Autocomplete,
    },
  );
}

export interface AutocompleteProps<A>
  extends UseAutocompleteProps<A, false, false, true> {
  control: Control<any>;
  textControl?: Control<string>;
  selectedControl?: Control<A | null>;
  options: A[];
  classes: AutocompleteRendererOptions;
  controlClasses?: AutocompleteClasses;
}

export function Autocomplete({
  id,
  textControl: tc,
  selectedControl: sc,
  options,
  control,
  classes,
  controlClasses,
  ...otherProps
}: AutocompleteProps<FieldOption | string>) {
  const { disabled } = control;
  const textControl = useControl("", { use: tc });
  const selectedControl = useControl(null, { use: sc });

  const listContainerClass = rendererClass(
    controlClasses?.listContainerClass,
    classes.listContainerClass,
  );
  const listEntryClass = rendererClass(
    controlClasses?.listEntryClass,
    classes.listEntryClass,
  );

  useControlEffect(
    controlValues(textControl, selectedControl),
    ([text, selected]) => {
      control.value = selected
        ? typeof selected === "string"
          ? selected
          : selected.value
        : text;
    },
  );

  const {
    getRootProps,
    getInputProps,
    getListboxProps,
    getOptionProps,
    groupedOptions,
    popupOpen,
    focused,
    getPopupIndicatorProps,
  } = useAutocomplete({
    id: id,
    options: options,
    value: selectedControl.value,
    inputValue: textControl.value,
    freeSolo: true,
    disabled: disabled,
    getOptionLabel: (v) => (typeof v === "string" ? v : v.name),
    filterOptions: (o, s) =>
      o.filter((o) => {
        const label = typeof o === "string" ? o : o.name;
        return label.toLowerCase().includes(s.inputValue.toLowerCase());
      }),
    onInputChange: (_, v, reason) => {
      textControl.value = v;
      if (reason === "input") selectedControl.value = null;
    },
    onChange: (_, v, reason) => {
      if (reason === "selectOption")
        selectedControl.value =
          typeof v === "string" ? { name: v, value: v } : v;
    },
    ...otherProps,
  });

  return (
    <div id={id} className={"relative"} {...getRootProps()}>
      <div
        className={clsx(
          "w-full flex gap-[5px] pr-[5px] overflow-hidden w-80 rounded-lg bg-white border border-solid border-gray-200 hover:border-primary-400 focus-visible:outline-0 shadow-[0_2px_4px_rgb(0_0_0_/_0.05)] min-h-[48px]",
          focused
            ? "border-primary-400 shadow-[0_0_0_3px_transparent] shadow-primary-200"
            : "shadow-[0_2px_2px_transparent] shadow-surface-50",
        )}
      >
        <input
          type={"text"}
          {...getInputProps()}
          className={
            "leading-[1.5] text-gray-900 bg-inherit border-0 rounded-[inherit] px-3 py-2 outline-0 grow shrink-0 basis-auto focus:outline-0 focus:ring-0 focus:shadow-none"
          }
        />

        <button
          {...getPopupIndicatorProps()}
          disabled={disabled}
          className={
            "outline-0 shadow-none border-0 py-0 px-0.5 bg-transparent pr-[10px]"
          }
        >
          <li
            className={clsx(
              "fa-solid fa-angle-down",
              "text-primary-500",
              popupOpen && "rotate-180",
            )}
          />
        </button>
      </div>
      {groupedOptions.length > 0 && popupOpen && (
        <ul {...getListboxProps()} className={listContainerClass}>
          {(groupedOptions as FieldOption[]).map((option, index) => {
            const optionProps = getOptionProps({ option, index });
            return (
              <li {...optionProps} className={listEntryClass}>
                {option.name}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
