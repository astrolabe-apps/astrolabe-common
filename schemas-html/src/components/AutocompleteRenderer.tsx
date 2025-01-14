import React from "react";
import {
  Control,
  controlValues,
  useComputed,
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
  className?: string;
  listContainerClass?: string;
  listEntryClass?: string;
  autocompletePlaceholder?: string;
}

export interface AutocompleteProps<A, Multiple extends boolean>
  extends UseAutocompleteProps<A, Multiple, false, true> {
  control: Control<any>;
  className?: string;
  classes: AutocompleteRendererOptions;
  controlClasses?: AutocompleteClasses;
}

export function createAutocompleteRenderer(
  options: AutocompleteRendererOptions = {},
) {
  return createDataRenderer(
    (p) => {
      // console.log(p);
      // console.log(options);
      return p.field.collection ? (
        <MultipleAutocomplete
          options={p.options ?? []}
          control={p.control}
          className={rendererClass(p.className, options.className)}
          classes={options}
          controlClasses={p.renderOptions as AutocompleteClasses}
          readOnly={p.readonly}
          id={p.id}
        />
      ) : (
        <SingleAutocomplete
          options={p.options ?? []}
          control={p.control}
          className={rendererClass(p.className, options.className)}
          classes={options}
          controlClasses={p.renderOptions as AutocompleteClasses}
          readOnly={p.readonly}
          id={p.id}
        />
      );
    },
    {
      renderType: DataRenderType.Autocomplete,
    },
  );
}

function SingleAutocomplete({
  ...props
}: AutocompleteProps<FieldOption | string, false>) {
  const { id, control, className, readOnly, classes, controlClasses } = props;
  const { disabled } = control;

  const inputControl = useControl<string>("");
  const selectedOptionControl = useControl<string | FieldOption | null>(null);

  const listContainerClass = rendererClass(
    controlClasses?.listContainerClass,
    classes.listContainerClass,
  );

  const listEntryClass = rendererClass(
    controlClasses?.listEntryClass,
    classes.listEntryClass,
  );

  useControlEffect(
    controlValues(inputControl, selectedOptionControl),
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
    freeSolo: true,
    multiple: false,
    value: selectedOptionControl.value,
    inputValue: inputControl.value,
    getOptionLabel: (v) => (typeof v === "string" ? v : v.name),
    filterOptions: (o, s) =>
      o.filter((o) => {
        const label = typeof o === "string" ? o : o.name;
        return label.toLowerCase().includes(s.inputValue.toLowerCase());
      }),
    onInputChange: (_, v, reason) => {
      inputControl.value = v;
      if (reason === "input") selectedOptionControl.value = null;
    },
    onChange: (_, v, reason) => {
      if (reason === "selectOption") {
        selectedOptionControl.value = v;
      }
    },
    ...props,
  });

  return (
    <div id={id} className={"relative"} {...getRootProps()}>
      <div
        className={clsx(
          className,
          focused
            ? "border-primary-400 shadow-[0_0_0_3px_transparent] shadow-primary-200"
            : "shadow-[0_2px_2px_transparent] shadow-surface-50",
        )}
      >
        <input
          type={"text"}
          {...getInputProps()}
          placeholder={controlClasses?.placeholder ?? ""}
          className={
            "leading-[1.5] text-surface-900 bg-[inherit] border-0 rounded-[inherit] px-3 py-2 outline-0 grow shrink-0 basis-auto focus:outline-0 focus:ring-0 focus:shadow-none"
          }
        />

        <button
          {...getPopupIndicatorProps()}
          disabled={disabled || readOnly}
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

function MultipleAutocomplete({
  ...props
}: AutocompleteProps<FieldOption, true>) {
  console.log("Multiple props", { ...props });

  const textControl = useControl<string[]>();
  const selectedOptions = useControl<(string | FieldOption)[]>();

  const inputValue = useComputed(() => textControl.value?.join(","));

  const {} = useAutocomplete({
    ...props,
    value: selectedOptions.value,
    inputValue: inputValue.value,
    onChange: (event, value, reason, details) => {},
  });

  return <>Multiple Autocomplete</>;
}
