import { Popover } from "./Popover";

import { RenderArrayElements, RenderControl } from "@react-typed-forms/core";
import {
  SchemaDataNode,
  SchemaField,
  SchemaInterface,
  SchemaNode,
} from "@react-typed-forms/schemas";
import React, { useId } from "react";
import clsx from "clsx";

export function FilterPopover({
  dataNode,
  valueNode,
  schemaInterface,
  setOption,
  isChecked,
  popoverClass,
  isAnyChecked,
  clear,
  clearText,
  clearClass,
}: {
  popoverClass?: string;
  dataNode: SchemaDataNode;
  valueNode: SchemaNode;
  schemaInterface: SchemaInterface;
  isAnyChecked: () => boolean;
  isChecked: (v: any) => boolean;
  setOption: (v: any, checked: boolean) => void;
  clear?: () => void;
  clearText: string;
  clearClass: string;
}) {
  const baseId = useId();
  return (
    <Popover
      content={<RenderControl render={showValues} />}
      className={popoverClass}
    >
      <i
        aria-hidden
        className={clsx(isAnyChecked() ? "fa-solid" : "fa-light", "fa-filter")}
      />
    </Popover>
  );

  function showValues() {
    const options = schemaInterface.getFilterOptions(dataNode, valueNode);
    return (
      <div>
        {clear && (
          <button onClick={clear} className={clearClass}>
            {clearText}
          </button>
        )}
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
