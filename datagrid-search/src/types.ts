/**
 * The contracts that everything else in this package is built around. Kept
 * dependency-free on purpose: `GridData` in particular is the interop surface, so
 * anything able to produce one — `useClientData`, or a react-query call wrapped in
 * `makeGridData` — can drive a grid.
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
  /**
   * Total matching rows, ignoring paging.
   *
   * **Optional**, because counting is often a second query over the whole
   * filtered set and can cost more than the page itself. Omit it and the grid
   * pages without knowing where the end is — see `pageInfo`. The README's
   * react-query recipe shows how to count once per search (not on every page) by
   * caching the total on a key that excludes paging.
   *
   * `null` counts as absent, so a response type generated from a nullable field —
   * `SearchResults<T>`'s `int?` comes out of NSwag as `total: number | null` —
   * can be handed over as-is. `makeGridData` normalises it, so `GridData.total`
   * keeps a single "not counted" value.
   */
  total?: number | null;
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
  /**
   * Filtered total, ignoring paging, or `undefined` when the source doesn't
   * count. Client-side sources always know it; server-side ones only if asked.
   *
   * `undefined` and `0` are different answers: the first means "not counted",
   * the second "counted, nothing matched".
   */
  total?: number;
  loading: boolean;
  error?: unknown;
  reload(): void;
  /** Spread onto `<DataGrid>`. */
  rowProps: GridRowProps<T>;
  /**
   * Filter options the source can supply without being asked per column, used
   * when a column declares no `options` of its own. Two shapes, because the two
   * modes have different raw material:
   *
   * - `facets` — already computed per field, as a server returns them.
   * - `optionRows` — rows for a field's options to be derived from, as the
   *   client-side source has. It takes the field so it can exclude that field's
   *   own filter, which is what makes a multi-select column behave like Excel's.
   */
  facets?: Record<string, FilterOption[]>;
  optionRows?: (field: string) => T[];
}

export interface GridRowProps<T> {
  bodyRows: number;
  getBodyRow(index: number): T;
}
