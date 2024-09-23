import { Popover } from "./Popover";

import {
  Control,
  RenderArrayElements,
  RenderControl,
} from "@react-typed-forms/core";
import { ColumnDef } from "@astroapps/datagrid";
import { FieldOption } from "@react-typed-forms/schemas";

export function FilterPopover({
  column,
  options,
  setOption,
}: {
  column: ColumnDef<any>;
  options: [FieldOption, Control<boolean>][];
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
    return (
      <RenderArrayElements
        array={options}
        children={([n, v]) => {
          const checked = !v.value;
          return (
            <label
              className="grid grid-cols-[auto_1fr] cursor-pointer gap-2 align-text-top"
              onClick={() => {
                setOption(n.value, checked);
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
