/**
 * The contracts that everything else in this package is built around. Kept
 * dependency-free on purpose: `GridData` in particular is the interop surface, so
 * anything able to produce one — `useClientData`, `useServerData`, or a
 * react-query call wrapped in `makeGridData` — can drive a grid.
 */

/** One selectable value in a column's filter. */
export interface FilterOption {
  value: string;
  /** Display text. Defaults to `value`. */
  label?: string;
  /** Matching row count, when the source can provide one. */
  count?: number;
  disabled?: boolean;
}

/** One page of results, as returned by a server-side search. */
export interface GridPage<T> {
  rows: T[];
  /** Total matching rows, ignoring paging — drives the pager. */
  total: number;
  /**
   * Per-field filter options returned alongside the page. Most search APIs can
   * produce these, which makes server-side filter options free: no second
   * request and no per-column wiring.
   */
  facets?: Record<string, FilterOption[]>;
}

/**
 * Everything a grid needs to know about its rows, and the only thing that differs
 * between client-side and server-side searching.
 */
export interface GridData<T> {
  /** The current page, ready to render. */
  rows: T[];
  /** Filtered total, ignoring paging. */
  total: number;
  loading: boolean;
  error?: unknown;
  reload(): void;
  /** Spread onto `<DataGrid>`. */
  rowProps: GridRowProps<T>;
}

export interface GridRowProps<T> {
  bodyRows: number;
  getBodyRow(index: number): T;
}
