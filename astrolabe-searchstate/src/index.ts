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
