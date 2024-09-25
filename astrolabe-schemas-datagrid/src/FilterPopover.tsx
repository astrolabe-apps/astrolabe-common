import { Popover } from "./Popover";

import { RenderArrayElements, RenderControl } from "@react-typed-forms/core";
import {
  SchemaDataNode,
  SchemaField,
  SchemaInterface,
  SchemaNode,
} from "@react-typed-forms/schemas";
import React from "react";

export function FilterPopover({
  dataNode,
  valueNode,
  schemaInterface,
  setOption,
  isChecked,
  baseId,
  popoverClass,
}: {
  baseId: string;
  popoverClass?: string;
  dataNode: SchemaDataNode;
  valueNode: SchemaNode;
  schemaInterface: SchemaInterface;
  isChecked: (v: any) => boolean;
  setOption: (v: any, checked: boolean) => void;
}) {
  return (
    <Popover
      content={<RenderControl render={showValues} />}
      className={popoverClass}
    >
      <i aria-hidden className="fa-light fa-filter" />{" "}
    </Popover>
  );

  function showValues() {
    const options = schemaInterface.getFilterOptions(dataNode, valueNode);
    return (
      <div>
        <RenderArrayElements
          array={options}
          children={(n, i) => {
            const checked = isChecked(n.value);
            return (
              <label
                className="grid grid-cols-[auto_1fr] cursor-pointer gap-2 align-text-top"
                htmlFor={baseId + i}
              >
                <input
                  id={baseId + i}
                  className="mt-0.5"
                  type="checkbox"
                  checked={checked}
                  onChange={() => setOption(n.value, !checked)}
                />
                <span className="inline align-middle">{n.name}</span>
              </label>
            );
          }}
        />
      </div>
    );
  }
}
