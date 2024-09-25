export type SearchFilters = { [colKey: string]: string[] };
export type SortDirection = "asc" | "desc";
export type SortField = [string, SortDirection];

export interface SearchingState {
  page: number;
  perPage: number;
  query: string | undefined;
  sort: string[];
  filters: SearchFilters;
  loading: boolean;
  totalRows: number;
}

export const defaultSearchingState: SearchingState = {
  filters: {},
  page: 0,
  perPage: 10,
  loading: true,
  query: "",
  sort: [],
  totalRows: 0,
};

export function sortFieldToString([sf, dir]: SortField): string {
  return dir[0] + sf;
}

export function stringToSortField(str: string): SortField {
  const dir = str[0] === "a" ? "asc" : "desc";
  return [str.substring(1), dir];
}

export function findSortField(
  sorts: string[],
  field: string | undefined,
): SortField | undefined {
  const sortStr = field
    ? sorts.find((s) => s.substring(1) === field)
    : undefined;
  return sortStr ? stringToSortField(sortStr) : undefined;
}

export function filterByQuery<V>(
  query: string,
  getText: (v: V) => string,
  rows: V[],
  additionalFilter?: (row: V) => boolean,
): V[] {
  const lq = query.toLowerCase();
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
  sorts: SortField[],
  getComparison: (field: string) => ((a: T, b: T) => number) | undefined,
  data: T[],
) {
  return [...data].sort((first, second) => {
    for (const i in sorts) {
      const [s, order] = sorts[i];
      const c = getComparison(s);
      const compared = c ? c(first, second) : 0;
      if (compared) {
        return compared * (order === "asc" ? 1 : -1);
      }
    }
    return 0;
  });
}

export function makeFilterFunc<T>(
  getFilterValue: (f: string) => ((row: T) => string) | undefined,
  filters: SearchFilters,
): ((f: T) => boolean) | undefined {
  const fv: [(row: T) => string, string[]][] = [];
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
