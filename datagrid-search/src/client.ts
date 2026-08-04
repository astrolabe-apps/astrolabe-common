/**
 * Client-side searching: sort, filter and page an in-memory array.
 *
 * Filtering does **not** go through searchstate's `makeFilterFunc`. That resolves
 * a field to a per-row value and tests `values.includes(value)`, which can't
 * express a `ColumnFilter.matches` predicate — a range or date filter's selected
 * values aren't row values. So the predicate is built here from each column's
 * matcher, which yields the same result as searchstate for the default case and
 * also supports `matches`. Query and sort still come from searchstate.
 */
import { useMemo } from "react";
import type { Control, ControlFields } from "@react-typed-forms/core";
import type { ColumnDef } from "@astroapps/datagrid";
import {
  filterByQuery,
  sortBySortFields,
  type SearchFilters,
  type SearchOptions,
} from "@astroapps/searchstate";
import type { GridData } from "./types";
import { columnSearching, findColumn } from "./columns";
import {
  columnFilterResolver,
  columnMatcher,
  defaultGetColumnFilter,
  filterFieldOf,
  type ColumnFilter,
  type GetColumnFilter,
} from "./filter";

export interface ClientDataOptions<T, D = unknown> {
  /** Every row, unsorted and unfiltered. */
  rows: T[];
  /** Needed for comparators, search text and filter values. */
  columns: ColumnDef<T, D>[];
  /** True while *you* are still fetching the full array. */
  loading?: boolean;
  /** Slice to `offset`/`length`. Defaults to true. */
  paged?: boolean;
  /**
   * A column's own filter is ignored when deriving its options, so selecting one
   * value doesn't hide the others — Excel's behaviour. Defaults to true.
   */
  optionsIgnoreOwnFilter?: boolean;
  /**
   * Must match what `useGridSearch` is given. Resolution is cached separately
   * here, which is safe because `getColumnFilter` is required to be pure.
   */
  getColumnFilter?: GetColumnFilter<T, D>;
  /** Restrict free-text search. Defaults to every leaf column with a `getter`. */
  searchColumns?: (column: ColumnDef<T, D>) => boolean;
  /**
   * Filtering that isn't a column filter — a date range or a toggle living
   * elsewhere on the page, held in fields your state added to `SearchOptions`.
   * Applied alongside the query and the column filters.
   *
   * The server-side counterpart is free: `fetch` receives the whole state, extra
   * fields included. Client-side the rows have to be tested here, since this
   * package can't know what those fields mean.
   */
  additionalFilter?: (row: T) => boolean;
}

/** A field's selected values, coerced — see `filter.ts` on why this is needed. */
function selectedValues(filters: SearchFilters, field: string): string[] {
  const stored = filters[field];
  if (!stored || stored.length === 0) return [];
  return stored.every((v) => typeof v === "string")
    ? (stored as string[])
    : stored.map((v) => String(v));
}

interface FieldMatcher<T> {
  field: string;
  values: string[];
  matches: (row: T, values: string[]) => boolean;
}

/**
 * One matcher per field that actually has a selection and a column able to test
 * it. A selection for an unknown field is ignored rather than excluding
 * everything — stale filters in a URL shouldn't empty the grid.
 */
function activeMatchers<T, D>(
  columns: ColumnDef<T, D>[],
  filters: SearchFilters,
  filterFor: (column: ColumnDef<T, D>) => ColumnFilter<T> | undefined,
): FieldMatcher<T>[] {
  const result: FieldMatcher<T>[] = [];
  for (const field of Object.keys(filters)) {
    const values = selectedValues(filters, field);
    if (values.length === 0) continue;
    let filter: ColumnFilter<T> | undefined;
    const column = findColumn(columns, (c) => {
      const f = filterFor(c);
      if (f && filterFieldOf(c, f) === field) {
        filter = f;
        return true;
      }
      return false;
    });
    if (!column || !filter) continue;
    const matches = columnMatcher(column, filter);
    if (matches) result.push({ field, values, matches });
  }
  return result;
}

export function useClientData<
  T,
  D = unknown,
  S extends SearchOptions = SearchOptions,
>(state: Control<S>, options: ClientDataOptions<T, D>): GridData<T> {
  const {
    rows,
    columns,
    additionalFilter,
    loading = false,
    paged = true,
    optionsIgnoreOwnFilter = true,
    getColumnFilter = defaultGetColumnFilter,
    searchColumns,
  } = options;

  // Read fields individually rather than `state.value`: each is referentially
  // stable until it actually changes, which is what makes the memo deps below
  // meaningful.
  //
  // Cast because `S` is only constrained to extend SearchOptions, so its mapped
  // fields come out optional. The constraint guarantees they're there.
  const fields = state.fields as unknown as ControlFields<SearchOptions>;
  const query = fields.query.value;
  const sort = fields.sort.value;
  const filters = fields.filters.value;
  const offset = fields.offset.value;
  const length = fields.length.value;

  const filterFor = useMemo(
    () => columnFilterResolver(columns, getColumnFilter),
    [columns, getColumnFilter],
  );

  const searching = useMemo(
    () => columnSearching(columns, { searchColumns }),
    [columns, searchColumns],
  );

  const { sorted, optionRows } = useMemo(() => {
    const matchers = activeMatchers(columns, filters ?? {}, filterFor);

    function rowsMatching(excludeField?: string) {
      const active = excludeField
        ? matchers.filter((m) => m.field !== excludeField)
        : matchers;
      const columnPredicate = active.length
        ? (row: T) => active.every((m) => m.matches(row, m.values))
        : undefined;
      const predicate =
        columnPredicate && additionalFilter
          ? (row: T) => columnPredicate(row) && additionalFilter(row)
          : (columnPredicate ?? additionalFilter);
      return filterByQuery(searching.getSearchText, query, rows, predicate);
    }

    const filtered = rowsMatching();
    // Sorting can't change the count, so `filtered.length` is the total either
    // way — but the page has to come from the sorted array.
    const sortedRows = sortBySortFields(
      searching.getComparison,
      sort,
      filtered,
    );

    // Derived per field on demand and cached, so a grid with ten filterable
    // columns doesn't do ten extra passes for popovers nobody opened.
    const perField = new Map<string, T[]>();
    return {
      sorted: sortedRows,
      optionRows: (field: string) => {
        if (!optionsIgnoreOwnFilter) return filtered;
        let forField = perField.get(field);
        if (!forField) {
          forField = rowsMatching(field);
          perField.set(field, forField);
        }
        return forField;
      },
    };
  }, [
    rows,
    columns,
    query,
    sort,
    filters,
    filterFor,
    searching,
    optionsIgnoreOwnFilter,
    additionalFilter,
  ]);

  const pageRows = useMemo(
    () => (paged ? sorted.slice(offset, offset + length) : sorted),
    [sorted, paged, offset, length],
  );

  return useMemo(
    () => ({
      rows: pageRows,
      total: sorted.length,
      loading,
      // Nothing to re-request: the rows were handed in. Whoever produced them
      // owns reloading.
      reload: () => {},
      rowProps: {
        bodyRows: pageRows.length,
        getBodyRow: (i: number) => pageRows[i],
      },
      optionRows,
    }),
    [pageRows, sorted.length, loading, optionRows],
  );
}
