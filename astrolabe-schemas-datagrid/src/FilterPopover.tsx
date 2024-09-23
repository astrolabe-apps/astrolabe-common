import { Popover } from "./Popover";

import { RenderArrayElements, RenderControl } from "@react-typed-forms/core";
import { SchemaField, SchemaInterface } from "@react-typed-forms/schemas";
import React from "react";

export function FilterPopover({
  field,
  schemaInterface,
  setOption,
  isChecked,
}: {
  field: SchemaField;
  schemaInterface: SchemaInterface;
  isChecked: (v: any) => boolean;
  setOption: (v: any, checked: boolean) => void;
}) {
  return (
    <Popover
      content={<RenderControl render={showValues} />}
      className="w-72 grid"
    >
      <i aria-hidden className="fa-light fa-filter" />{" "}
    </Popover>
  );

  function showValues() {
    const options = schemaInterface.getFilterOptions(field);
    return (
      <RenderArrayElements
        array={options}
        children={(n) => {
          const checked = isChecked(n.value);
          return (
            <label
              className="grid grid-cols-[auto_1fr] cursor-pointer gap-2 align-text-top"
              onClick={() => {
                setOption(n.value, !checked);
              }}
            >
              <input className="mt-0.5" type="checkbox" checked={checked} />
              <span className="inline align-middle">{n.name}</span>
            </label>
          );
        }}
      />
    );
  }
}
