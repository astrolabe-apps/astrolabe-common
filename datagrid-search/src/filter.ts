/**
 * Filtering over `SearchOptions.filters`.
 *
 * Two things to know about the storage. It is `SearchFilters`, i.e.
 * `Record<string, unknown[]>` — that shape is fixed by the NSwag mapping from the
 * C# side and is not ours to narrow. And a field control for a key that isn't
 * present reads `undefined`, not `[]`, while *writing* `[]` through it would add
 * an empty array to the state — visible in URLs and in react-query keys. So
 * nothing is seeded: reads coerce (`values`), and writes remove the key when the
 * result is empty (`setValues`).
 *
 * `makeGridFilter` reads `.value` when called, so **call it during render**, like
 * `makeGridSort`.
 */
import type { ReactNode } from "react";
import type { Control } from "@react-typed-forms/core";
import type { SearchFilters, SearchOptions } from "@astroapps/searchstate";
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
  /** `selected.value` coerced to strings, which is what most popups want. */
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
  /** The selected values, coerced to strings. */
  values(field: string): string[];
  /** Replaces a field's values, removing the key entirely when empty. */
  setValues(field: string, next: string[]): void;
  toggle(field: string, value: string, on: boolean): void;
  active(field: string): boolean;
  /** Clears one field, or every field when called with no argument. */
  clear(field?: string): void;
  /** Every field with a selection, for a filter-chip bar or "clear all". */
  activeFields(): string[];
}

export interface GridFilterOptions<T, D> {
  /** From `columnFilterResolver`. Defaults to uncached resolution. */
  filterFor?: (column: ColumnDef<T, D>) => ColumnFilter<T> | undefined;
}

/**
 * Coerces stored values to strings. Necessary because `SearchFilters` holds
 * `unknown[]`, so state hydrated from a URL or an API can legitimately contain
 * numbers or booleans — without this a hydrated `2` would never match a rendered
 * `"2"` and the filter would silently exclude everything. Returns the original
 * array when it's already all strings, so callers can rely on referential
 * stability in the common case.
 */
function asStrings(stored: unknown[] | undefined): string[] {
  if (!stored) return [];
  return stored.every((v) => typeof v === "string")
    ? (stored as string[])
    : stored.map((v) => String(v));
}

export function makeGridFilter<
  T = any,
  D = unknown,
  S extends SearchOptions = SearchOptions,
>(state: Control<S>, options: GridFilterOptions<T, D> = {}): GridFilter<T, D> {
  const { filterFor = defaultGetColumnFilter } = options;
  // Cast because `S` is only constrained to extend SearchOptions, so
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
    return asStrings(current[field]);
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
    // Unguarded: a Control doesn't notify when the value it's given is the one it
    // already has.
    state.fields.offset.value = 0;
  }

  return {
    filterFor,
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
      if (on === existing.includes(value)) return;
      setValues(
        field,
        on ? [...existing, value] : existing.filter((v) => v !== value),
      );
    },
    active: (field) => values(field).length > 0,
    activeFields: () =>
      Object.keys(current).filter((f) => asStrings(current[f]).length > 0),
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
