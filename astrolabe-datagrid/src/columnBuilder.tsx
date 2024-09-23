import { ColumnDef, ColumnRenderer, Sortable } from "./columns";

type IdOrTitle =
  | { title: string; id?: string }
  | { id: string; title?: string };

type FilterField<T> = {
  filterField: string;
  filterValue: (row: T) => [string, string];
};

interface GetterColumn<T, D> {
  getter: (row: T) => Sortable;
  render?: ColumnRenderer<T, D>;
  filterField?: string;
  filterValue?: (row: T) => [string, string];
}

type ColumnRenderInit<T, D> =
  | GetterColumn<T, D>
  | ({
      render: ColumnRenderer<T, D>;
    } & (FilterField<T> | {}))
  | {
      children: ColumnDefInit<T, D>[];
      render?: ColumnRenderer<T, D>;
    };

/**
 * Represents the initialization properties for a `ColumnDef` object.
 *
 * @template T The type of the row data.
 * @template D The type of the additional data passed to the `CellRenderer`.
 */
export type ColumnDefInit<T, D = unknown> = IdOrTitle &
  ColumnRenderInit<T, D> &
  Omit<ColumnDef<T, D>, "id" | "title" | "filterField" | "render" | "children">;

export function initColumn<T, D = unknown>(
  x: ColumnDefInit<T, D>,
  i?: number,
): ColumnDef<T, D> {
  const render: ColumnRenderer<T, D> =
    "render" in x
      ? x.render!
      : "children" in x
        ? () => <></>
        : (r: T) => (x as GetterColumn<T, D>).getter(r)?.toString();
  const columnDef: ColumnDef<T, D> = {
    ...x,
    id: x.id ?? (x.title ? x.title : (i?.toString() ?? "0")),
    title: x.title ?? "",
    render,
    children:
      "children" in x
        ? x.children
          ? columnDefinitions(...x.children)
          : undefined
        : undefined,
  };
  if (columnDef.sortField && !columnDef.compare) {
    const getter = columnDef.getter;
    if (getter) {
      columnDef.compare = (f: T, s: T) => compareAny(getter(f), getter(s));
    }
  }
  if (columnDef.filterField && !columnDef.filterValue) {
    const getter = columnDef.getter;
    if (getter) {
      columnDef.filterValue = getterToFilter(getter);
    }
  }
  return columnDef;
}

/**
 * Returns an array of `ColumnDef` objects based on the provided `ColumnDefInit` objects.
 *
 * @template T The type of the row data.
 * @template D The type of the additional data passed to the `CellRenderer`.
 * @param {...ColumnDefInit<T, D>[]} defs The `ColumnDefInit` objects to use to create the `ColumnDef` objects.
 * @returns {ColumnDef<T, D>[]} An array of `ColumnDef` objects.
 */
export function columnDefinitions<T, D = unknown>(
  ...defs: ColumnDefInit<T, D>[]
): ColumnDef<T, D>[] {
  return defs.map(initColumn);
}

/**
 * Converts a getter function that returns a `Sortable` value to a filter function that returns a tuple of strings.
 *
 * @template T The type of the row data.
 * @param {(row: T) => Sortable} getter The getter function to convert to a filter function.
 * @returns {(row: T) => [string, string]} A filter function that returns a tuple of strings.
 */
export function getterToFilter<T>(
  getter: (row: T) => Sortable,
): (row: T) => [string, string] {
  return (r) => {
    const v = getter(r);
    if (typeof v === "string") {
      return [v, v];
    }
    if (v === null || v === undefined) {
      return ["", "<Empty>"];
    }
    const sv = v.toString();
    return [sv, sv];
  };
}

export function compareAny(first: any, second: any): number {
  return first === second ? 0 : first > second ? 1 : -1;
}
