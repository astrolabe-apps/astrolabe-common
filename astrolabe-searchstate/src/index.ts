export type SearchFilters = { [colKey: string]: unknown[] };

export interface FilterAndSortState {
  query: string | null;
  sort: string[];
  filters: SearchFilters;
}

export interface SearchPagingState {
  offset: number;
  length: number;
}

export interface SearchOptions extends FilterAndSortState, SearchPagingState {}

export const defaultSearchOptions: SearchOptions = {
  filters: {},
  offset: 0,
  length: 10,
  query: "",
  sort: [],
};

export interface ClientSideSearching<T> {
  getSearchText: (row: T) => string;
  getComparison: (field: string) => ((a: T, b: T) => number) | undefined;
  getFilterValue: (field: string) => ((row: T) => unknown) | undefined;
}

export function findSortField(
  sorts: string[] | null | undefined,
  field: string | undefined,
): string | undefined {
  return field && sorts
    ? sorts.find((s) => s?.substring(1) === field)
    : undefined;
}

export function filterByQuery<V>(
  getText: (v: V) => string,
  query: string | undefined | null,
  rows: V[],
  additionalFilter?: (row: V) => boolean,
): V[] {
  const lq = query?.toLowerCase() ?? "";
  if (!lq && !additionalFilter) {
    return rows;
  }
  return rows.filter((r) => {
    const allowed = additionalFilter ? additionalFilter(r) : true;
    if (!allowed || !lq) {
      return allowed;
    }
    const queryText = getText(r);
    return queryText && queryText.includes(lq);
  });
}

export function sortBySortFields<T>(
  getComparison: (field: string) => ((a: T, b: T) => number) | undefined,
  sorts: string[] | undefined | null,
  data: T[],
): T[] {
  if (!sorts) return data;
  return [...data].sort((first, second) => {
    for (const i in sorts) {
      const fullSort = sorts[i];
      if (fullSort) {
        const c = getComparison(fullSort.substring(1));
        const compared = c ? c(first, second) : 0;
        if (compared) {
          return compared * (fullSort[0] === "a" ? 1 : -1);
        }
      }
    }
    return 0;
  });
}

export function makeFilterFunc<T>(
  getFilterValue: (f: string) => ((row: T) => unknown) | undefined,
  filters: SearchFilters | undefined,
): ((f: T) => boolean) | undefined {
  if (!filters) return undefined;
  const fv: [(row: T) => unknown, unknown[]][] = [];
  Object.keys(filters).forEach((ch) => {
    const vals = filters[ch];
    if (!vals || vals.length === 0) {
      return;
    }
    const col = getFilterValue(ch);
    if (col) {
      fv.push([col, vals]);
    }
  });
  if (fv.length === 0) {
    return undefined;
  }
  return (row) => fv.every(([f, vals]) => vals.includes(f(row)));
}

export function setFilterValue(
  column: string,
  value: unknown,
  set: boolean,
): (f: SearchFilters | undefined) => SearchFilters {
  return (_filters) => {
    const filters = _filters ?? {};
    let curValues = filters[column];
    if (!set && !curValues) {
      return filters;
    }
    const newValues = !curValues ? [value] : setIncluded(curValues, value, set);
    if (newValues === curValues) {
      return filters;
    }
    const newFilters = { ...filters };
    newFilters[column] = newValues;
    return newFilters;
  };
}

function setIncluded<A>(array: A[], elem: A, included: boolean): A[] {
  const already = array.includes(elem);
  if (included === already) {
    return array;
  }
  if (included) {
    return [...array, elem];
  }
  return array.filter((e) => e !== elem);
}

export function rotateSort(
  sortField: string,
  defaultSort: string = "a",
): (existing: string[] | undefined) => string[] {
  return (_cols) => {
    const cols = _cols ?? [];
    const currentSort = findSortField(cols, sortField);
    const currentDirection = currentSort ? currentSort[0] : undefined;
    if (!currentDirection) {
      return [defaultSort + sortField, ...cols];
    }
    let nextDir: string | undefined;
    switch (currentDirection) {
      case "a":
        nextDir = defaultSort === "a" ? "d" : undefined;
        break;
      case "d":
        nextDir = defaultSort === "d" ? "a" : undefined;
    }
    const withoutExisting = cols.filter((c) => c.substring(1) !== sortField);
    return nextDir
      ? [nextDir + sortField, ...withoutExisting]
      : withoutExisting;
  };
}

export function makeClientSortAndFilter<T>(
  client: ClientSideSearching<T>,
): (searchParams: FilterAndSortState, rows: T[]) => T[] {
  return ({ sort, filters, query }, rows) => {
    const f = makeFilterFunc<T>(client.getFilterValue, filters);
    return sortBySortFields(
      client.getComparison,
      sort,
      filterByQuery(client.getSearchText, query, rows, f),
    );
  };
}

export function getPageOfResults<T>(offset: number, length: number, rows: T[]) {
  return rows.slice(offset, offset + length);
}
