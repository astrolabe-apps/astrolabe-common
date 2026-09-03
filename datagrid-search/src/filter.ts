/**
 * Filtering over `SearchRequest.filters`.
 *
 * The storage is `SearchFilters`, i.e. `Record<string, string[]>`. A field
 * control for a key that isn't present reads `undefined`, not `[]`, while
 * *writing* `[]` through it would add an empty array to the state — visible in
 * URLs and in react-query keys. So nothing is seeded: reads default an absent key
 * to `[]` (`values`), and writes remove the key when the result is empty
 * (`setValues`).
 *
 * `makeGridFilter` reads `.value` when called, so **call it during render**, like
 * `makeGridSort`.
 */
import type { ReactNode } from "react";
import type { Control } from "@react-typed-forms/core";
import type { SearchFilters, SearchRequest } from "@astroapps/searchstate";
import type { ColumnDef } from "@astroapps/datagrid";
import type { FilterOption } from "./types";
import type { FilterOptionSource, FilterOptions } from "./options";
import { columnFilterValue } from "./columns";

/**
 * How one column filters. Everything is optional: `{}` means "filterable, all
 * defaults", which is what the zero-config path produces.
 */
export interface ColumnFilter<T> {
  /** Filter key. Defaults to the column's `filterField`, then its `id`. */
  field?: string;
  options?: FilterOptionSource<T>;
  /**
   * Row predicate. Defaults to matching the column's `filterValue` against the
   * selected values. Supply one for range/date/text filters, whose selected
   * values aren't a set of discrete row values.
   *
   * **Client-side only** — a server has to implement the equivalent itself.
   */
  matches?: (row: T, values: string[]) => boolean;
  /**
   * Replaces the popup body, keeping the standard trigger and shell.
   *
   * `ReactNode` is the one React type this package's contracts expose — it's what
   * the renderer fulfils, and typing it `unknown` only pushes a cast into every
   * renderer.
   */
  render?: (props: FilterPopupProps<T>) => ReactNode;
  /** Defaults to true. */
  multiple?: boolean;
  /** Show an options-search box. Defaults to on past ~12 options. */
  searchable?: boolean;
  /**
   * Show each option's row count beside it, when its source provided one.
   * Defaults to true.
   *
   * Purely about display: options that carry no `count` show none either way, and
   * this doesn't stop one being computed — to skip the counting itself, a derived
   * source takes `counts: false`.
   */
  showCounts?: boolean;
}

/**
 * Resolves how a column filters — or `undefined` for "it doesn't".
 *
 * A function rather than a field-keyed map because filtering is usually
 * patterned: one rule keyed off `column.data` can cover every enum column, which
 * is also how schema-generated columns get their filter behaviour without
 * registering each one by hand.
 *
 * **Must be pure and cheap.** It's called per column; building a fresh `options`
 * array or `render` closure per call breaks memo deps downstream and, against an
 * async source, can loop. Results are cached per column id by
 * `columnFilterResolver`.
 */
export type GetColumnFilter<T, D = unknown> = (
  column: ColumnDef<T, D>,
) => ColumnFilter<T> | undefined;

/** What a custom popup receives. Writing to `selected` is the whole contract. */
export interface FilterPopupProps<T = any> {
  column: ColumnDef<T, any>;
  field: string;
  /**
   * This column's selected values. `undefined` when nothing is selected — see
   * this module's header for why it isn't normalised to `[]`.
   */
  selected: Control<string[] | undefined>;
  /** `selected.value`, or `[]` when nothing is selected. */
  values: string[];
  options: FilterOptions;
  /** Bound to the options-search box, when `searchable`. */
  search: Control<string>;
  close(): void;
}

/**
 * The default: a column filters exactly when it has a `filterField`, matching the
 * existing convention.
 */
export const defaultGetColumnFilter: GetColumnFilter<any, any> = (column) =>
  column.filterField ? {} : undefined;

/** Builds a `GetColumnFilter` from a field-keyed map, for one-off columns. */
export function byFilterField<T, D = unknown>(
  map: Record<string, ColumnFilter<T>>,
): GetColumnFilter<T, D> {
  return (column) => {
    const field = column.filterField ?? column.id;
    return map[field];
  };
}

/** The filter key a column stores its values under. */
export function filterFieldOf<T, D>(
  column: ColumnDef<T, D>,
  filter: ColumnFilter<T>,
): string {
  return filter.field ?? column.filterField ?? column.id;
}

/**
 * Caches `getColumnFilter` per column id, so a stable function is called once per
 * column per `columns` change rather than once per render. Build inside a
 * `useMemo` keyed on `columns`.
 */
export function columnFilterResolver<T, D>(
  columns: ColumnDef<T, D>[],
  getColumnFilter: GetColumnFilter<T, D> = defaultGetColumnFilter,
): (column: ColumnDef<T, D>) => ColumnFilter<T> | undefined {
  const cache = new Map<string, ColumnFilter<T> | undefined>();
  void columns; // keyed on identity by the caller's useMemo, not read here
  return (column) => {
    if (cache.has(column.id)) return cache.get(column.id);
    const resolved = getColumnFilter(column);
    cache.set(column.id, resolved);
    return resolved;
  };
}

/**
 * One field's values after toggling one of them.
 *
 * Multi-select adds and removes; single-select replaces, so turning an option on
 * drops whatever was selected before. Returns the array unchanged when the toggle
 * asks for what's already true.
 */
export function toggledValues(
  values: string[],
  value: string,
  on: boolean,
  multiple = true,
): string[] {
  if (!multiple) return on ? [value] : [];
  if (on === values.includes(value)) return values;
  return on ? [...values, value] : values.filter((v) => v !== value);
}

/**
 * The row predicate for one column's selected values — its `matches` if it has
 * one, otherwise its `filterValue` against the selection.
 */
export function columnMatcher<T, D>(
  column: ColumnDef<T, D>,
  filter: ColumnFilter<T>,
): ((row: T, values: string[]) => boolean) | undefined {
  if (filter.matches) return filter.matches;
  const value = columnFilterValue(column);
  if (!value) return undefined;
  return (row, values) => values.includes(value(row).value);
}

/**
 * When a popup's selection reaches the search, and what an empty selection means.
 *
 * - `immediate` — every click searches. The default.
 * - `apply` — the selection is held until Apply. Worth it against a server,
 *   where three ticks would otherwise be three searches, two of them stale.
 * - `excel` — `apply`, plus Excel's inversion: an unfiltered column shows every
 *   value *ticked* rather than none, there's a select-all, and applying with
 *   everything ticked stores no filter at all. Applying with nothing ticked is
 *   refused, since "match none" isn't a state the storage can express — it's the
 *   same empty array that means "unfiltered".
 *
 * Grid-wide on purpose: which click searches, and what a tick means, shouldn't
 * vary between one funnel and the next.
 */
export type FilterMode = "immediate" | "apply" | "excel";

export interface GridFilter<T = any, D = unknown> {
  /** How this column filters, or undefined if it doesn't. Cached. */
  filterFor(column: ColumnDef<T, D>): ColumnFilter<T> | undefined;
  isFilterable(column: ColumnDef<T, D>): boolean;
  /** The key this column's values are stored under, or undefined if unfiltered. */
  field(column: ColumnDef<T, D>): string | undefined;
  /**
   * Stable, writable control for one field's values — what a custom popup owns.
   * Reads `undefined` when nothing is selected.
   */
  selected(field: string): Control<string[] | undefined>;
  /** The selected values, or `[]` when the field has no selection. */
  values(field: string): string[];
  /** Replaces a field's values, removing the key entirely when empty. */
  setValues(field: string, next: string[]): void;
  toggle(field: string, value: string, on: boolean): void;
  active(field: string): boolean;
  /** Clears one field, or every field when called with no argument. */
  clear(field?: string): void;
  /** Every field with a selection, for a filter-chip bar or "clear all". */
  activeFields(): string[];
  /** See `FilterMode`. `useFilterDraft` reads it from here. */
  mode: FilterMode;
  /**
   * Whether a popup holds its selection until Apply rather than searching on
   * every click. Derived: true for every mode but `immediate`.
   */
  deferApply: boolean;
}

export interface GridFilterOptions<T, D> {
  /** From `columnFilterResolver`. Defaults to uncached resolution. */
  filterFor?: (column: ColumnDef<T, D>) => ColumnFilter<T> | undefined;
  /** See `FilterMode`. Defaults to `immediate`, or `apply` if `deferApply`. */
  mode?: FilterMode;
  /** Older spelling of `mode: "apply"`. Ignored when `mode` is given. */
  deferApply?: boolean;
}

export function makeGridFilter<
  T = any,
  D = unknown,
  S extends SearchRequest = SearchRequest,
>(state: Control<S>, options: GridFilterOptions<T, D> = {}): GridFilter<T, D> {
  const {
    filterFor = defaultGetColumnFilter,
    deferApply = false,
    mode = deferApply ? "apply" : "immediate",
  } = options;
  // Cast because `S` is only constrained to extend SearchRequest, so
  // `fields.filters` resolves to a union that can't be indexed by an arbitrary
  // field name. The constraint guarantees the shape; this states it.
  const filters = state.fields.filters as unknown as Control<SearchFilters>;
  const current = filters.value ?? {};

  function selected(field: string): Control<string[] | undefined> {
    // Reading `.fields[key]` for an absent key creates the control lazily without
    // touching the parent value, and hands back the same instance each time.
    return filters.fields[field] as unknown as Control<string[] | undefined>;
  }

  function values(field: string): string[] {
    return current[field] ?? [];
  }

  function setValues(field: string, next: string[]) {
    filters.setValue((existing) => {
      const from = (existing ?? {}) as SearchFilters;
      if (next.length === 0) {
        if (!(field in from)) return from;
        // Delete rather than store [], so an emptied filter leaves no trace in
        // URLs or query keys.
        const { [field]: _dropped, ...rest } = from;
        return rest;
      }
      return { ...from, [field]: next };
    });
    resetPaging();
  }

  /**
   * Filtering changes which rows exist, so an offset into the old result set is
   * meaningless and may be past the end entirely. Always back to the first page.
   *
   * Only interaction through this object resets: a caller writing
   * `state.fields.filters.value` directly is managing the search itself, and this
   * stays out of the way.
   */
  function resetPaging() {
    state.fields.offset.value = 0;
  }

  return {
    filterFor,
    mode,
    deferApply: mode !== "immediate",
    isFilterable: (column) => !!filterFor(column),
    field: (column) => {
      const filter = filterFor(column);
      return filter ? filterFieldOf(column, filter) : undefined;
    },
    selected,
    values,
    setValues,
    toggle: (field, value, on) => {
      const existing = values(field);
      const next = toggledValues(existing, value, on);
      // Same array back means the toggle asked for what was already true.
      if (next !== existing) setValues(field, next);
    },
    active: (field) => values(field).length > 0,
    activeFields: () =>
      Object.keys(current).filter((f) => (current[f]?.length ?? 0) > 0),
    clear: (field) => {
      if (field !== undefined) {
        setValues(field, []);
        return;
      }
      if (Object.keys(current).length === 0) return;
      filters.value = {};
      resetPaging();
    },
  };
}

/** Re-exported for convenience, since popups deal in these. */
export type { FilterOption };
