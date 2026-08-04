/**
 * Sorting over `SearchOptions.sort` — searchstate's `string[]` of `"a"`/`"d"`
 * prefixed field names.
 *
 * `makeGridSort` reads `.value` when called, so **call it during render**: that's
 * what registers the dependency with the calling component's control tracking, so
 * the header re-renders when the sort changes. It is deliberately not memoised.
 *
 * Note what isn't here: applying the sort to rows. That belongs to the data
 * source, and its absence is how a server source says "these rows are already
 * ordered".
 */
import type { Control } from "@react-typed-forms/core";
import type { SearchOptions } from "@astroapps/searchstate";
import type { ColumnDef, SortDirection } from "@astroapps/datagrid";
import { encodeSortField, sortEntryField, sortFieldDirection } from "./columns";

/**
 * How a header click affects existing sorts.
 *
 * - `single` — one sorted column at a time, like Fluent's own DataGrid.
 * - `multiple` — every click keeps the other sorts.
 * - `shift` — plain click replaces, shift-click adds. The spreadsheet behaviour.
 */
export type SortMode = "single" | "multiple" | "shift";

export interface SortOptions {
  /** Defaults to `"single"`, matching Fluent. */
  mode?: SortMode;
  /**
   * Include the third "unsorted" step, so clicks cycle
   * default → reverse → unsorted. Off by default, so they flip
   * ascending ↔ descending like Fluent's DataGrid.
   */
  cycleUnsorted?: boolean;
  /** Zero `offset` when the sort changes. Defaults to true. */
  resetPaging?: boolean;
}

export interface GridSort {
  /** Whether this column offers sorting at all. */
  isSortable(column: ColumnDef<any, any>): boolean;
  /** Current direction, or undefined when unsorted. */
  direction(column: ColumnDef<any, any>): SortDirection | undefined;
  /**
   * 1-based precedence, for a "sorted 2nd" badge. Undefined in single mode, and
   * undefined when this is the only sorted column — there's no ordering to show.
   */
  priority(column: ColumnDef<any, any>): number | undefined;
  /** Advance this column's sort, as clicking its header does. */
  toggle(column: ColumnDef<any, any>, ev?: { shiftKey?: boolean }): void;
}

const opposite = (dir: SortDirection): SortDirection =>
  dir === "asc" ? "desc" : "asc";

/**
 * The sort cycle: unsorted → the column's default → the reverse → (unsorted).
 * Returning undefined means "not sorted".
 */
export function nextSortDirection(
  current: SortDirection | undefined,
  defaultSort: SortDirection,
  cycleUnsorted: boolean,
): SortDirection | undefined {
  if (!current) return defaultSort;
  if (current === defaultSort) return opposite(defaultSort);
  // Back at the start of the cycle: either drop the sort, or skip that step and
  // go straight to the default so clicks just flip direction.
  return cycleUnsorted ? undefined : defaultSort;
}

/**
 * Applies one field's new direction to the sort list.
 *
 * In multiple mode an already-sorted column keeps its precedence rather than
 * jumping to the front — a click should change direction, not silently reorder
 * the other columns — and a newly sorted one is appended as least significant.
 */
export function applySortField(
  sorts: string[],
  field: string,
  dir: SortDirection | undefined,
  multiple: boolean,
): string[] {
  if (!multiple) return dir ? [encodeSortField(field, dir)] : [];
  const index = sorts.findIndex((s) => sortEntryField(s) === field);
  if (!dir) return sorts.filter((s) => sortEntryField(s) !== field);
  const entry = encodeSortField(field, dir);
  if (index < 0) return [...sorts, entry];
  const next = [...sorts];
  next[index] = entry;
  return next;
}

export function makeGridSort(
  state: Control<SearchOptions>,
  options: SortOptions = {},
): GridSort {
  const {
    mode = "single",
    cycleUnsorted = false,
    resetPaging = true,
  } = options;
  const sortControl = state.fields.sort;
  const sorts = sortControl.value ?? [];

  function fieldOf(column: ColumnDef<any, any>) {
    return column.sortField;
  }

  return {
    isSortable: (column) => !!fieldOf(column),
    direction: (column) => sortFieldDirection(sorts, fieldOf(column)),
    priority: (column) => {
      if (mode === "single" || sorts.length < 2) return undefined;
      const field = fieldOf(column);
      if (!field) return undefined;
      const index = sorts.findIndex((s) => sortEntryField(s) === field);
      return index < 0 ? undefined : index + 1;
    },
    toggle: (column, ev) => {
      const field = fieldOf(column);
      if (!field) return;
      const next = nextSortDirection(
        sortFieldDirection(sorts, field),
        column.defaultSort ?? "asc",
        cycleUnsorted,
      );
      const multiple =
        mode === "multiple" || (mode === "shift" && !!ev?.shiftKey);
      sortControl.value = applySortField(sorts, field, next, multiple);
      if (resetPaging) {
        const offset = state.fields.offset;
        // Guarded so an already-zero offset doesn't fire a change notification.
        if (offset.value !== 0) offset.value = 0;
      }
    },
  };
}
