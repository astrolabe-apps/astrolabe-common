import { Popover } from "../Popover";
import { SearchingState } from "@astroapps/client/app/searching";

import {
  RenderArrayElements,
  RenderControl,
  useComputed,
} from "@react-typed-forms/core";
import { ColumnDef } from "@astroapps/datagrid";
import { setFilterValue } from "./index";

export function FilterPopover({
  state,
  column,
  filterField,
  useFilterValues,
}: {
  state: SearchingState;
  column: ColumnDef<any, unknown>;
  filterField: string;
  useFilterValues(field: string): [string, string][];
}) {
  return (
    <Popover content={<RenderControl render={showValues} />} className="w-72">
      <i aria-hidden className="fa-light fa-filter ml-2" />{" "}
    </Popover>
  );

  function showValues() {
    const filterValues = useFilterValues(filterField);
    return (
      <RenderArrayElements
        array={filterValues}
        children={([n, v]) => {
          const checked = useComputed(() =>
            state.fields.filters.value[filterField]?.includes(v),
          ).value;
          return (
            <div
              onClick={() => {
                state.fields.filters.setValue(
                  setFilterValue(filterField, v, !checked),
                );
                state.fields.page.value = 0;
              }}
            >
              <input type="checkbox" checked={checked} className="mr-2" />
              {n}
            </div>
          );
        }}
      />
    );
  }
}
