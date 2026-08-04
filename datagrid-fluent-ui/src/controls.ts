/**
 * Adapters for `@react-typed-forms/core` Controls and for
 * `@astroapps/searchstate` state held in a Control.
 *
 * `@react-typed-forms/core` is only imported for its types, so this module adds
 * no runtime dependency on it — which is why it's an optional peer.
 *
 * All of these read `.value` when called, so **call them during render** (like a
 * hook, though they aren't ones). That's what registers the dependency with the
 * calling component's control tracking, so the grid re-renders when the state
 * changes.
 */
import type { Control } from "@react-typed-forms/core";
import type {
  FilterAndSortState,
  SearchPagingState,
} from "@astroapps/searchstate";
import { arraySelection, type FluentSelection } from "./selection";
import {
  columnIdSort,
  searchStateSort,
  type FluentSort,
  type FluentSortState,
} from "./sorting";

export interface ControlSelectionOptions<T> {
  /** Control holding the selected row ids. */
  selected: Control<string[]>;
  rows: T[];
  getId: (row: T) => string;
}

/** `FluentSelection` backed by a `Control<string[]>` of selected ids. */
export function controlSelection<T>({
  selected,
  rows,
  getId,
}: ControlSelectionOptions<T>): FluentSelection<T> {
  return arraySelection({
    rows,
    getId,
    selectedIds: selected.value,
    onChange: (ids) => (selected.value = ids),
  });
}

/** Single-column, id-based sorting backed by a Control. */
export function controlSort(state: Control<FluentSortState>): FluentSort {
  return columnIdSort(state.value, (next) => (state.value = next));
}

export interface ControlSearchStateSortOptions {
  /** Keep secondary sorts. Off by default, matching Fluent's 1-column look. */
  multiple?: boolean;
  /**
   * Include `rotateSort`'s third "unsorted" step. Off by default, so clicks flip
   * ascending ↔ descending like Fluent's own DataGrid.
   */
  cycleUnsorted?: boolean;
  /**
   * Reset `offset` to 0 when the sort changes, as `@astroapps/searchstate`
   * consumers normally do. Defaults to true when the state has an `offset`.
   */
  resetPaging?: boolean;
}

/**
 * Sorting backed by a Control of `@astroapps/searchstate` state — i.e. the
 * `SearchOptions`/`FilterAndSortState` a search page already keeps. Columns sort
 * by their `sortField`.
 */
export function controlSearchStateSort(
  state: Control<FilterAndSortState & Partial<SearchPagingState>>,
  options: ControlSearchStateSortOptions = {},
): FluentSort {
  const { multiple, resetPaging, cycleUnsorted } = options;
  const fields = state.fields;
  const offset = fields.offset as Control<number | undefined> | undefined;
  return searchStateSort({
    sort: fields.sort.value,
    onChange: (next) => (fields.sort.value = next),
    onSortChanged:
      (resetPaging ?? true) && offset
        ? () => {
            if (offset.value !== undefined) offset.value = 0;
          }
        : undefined,
    multiple,
    cycleUnsorted,
  });
}
