/**
 * Row selection.
 *
 * **Page-scoped**: the header checkbox reflects and acts on the rows currently
 * rendered, and never disturbs a selection made on another page. Cross-page
 * "select all N matching" is deliberately not supported — that would need the
 * filtered total, the live search and a way to fetch every matching id, at which
 * point selection stops being a renderer concern and belongs next to `GridData`.
 *
 * Kept free of `@fluentui` imports so it can move to `@astroapps/datagrid-search`
 * if that day comes. The Fluent half is `selectionColumn.tsx`.
 */
import type { Control } from "@react-typed-forms/core";

export interface GridSelection<T> {
  isSelected(row: T): boolean;
  /** Toggles a row, or forces it to `on` when given. */
  toggle(row: T, on?: boolean): void;
  /** Every row on the current page is selected. */
  allSelected: boolean;
  /** Some but not all of the current page — the "mixed" checkbox state. */
  someSelected: boolean;
  /** Selects the whole page, or clears just this page when it's all selected. */
  toggleAll(): void;
}

export interface ArraySelectionOptions<T> {
  /** The rows currently on screen. Selection is scoped to these. */
  rows: T[];
  getId: (row: T) => string;
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
}

/**
 * `GridSelection` over a plain array of selected ids.
 *
 * The page-scoping is the fiddly part, and the previous implementation got it
 * wrong: it compared `selectedIds.length >= rows.length`, i.e. the *total*
 * selected count against the *current page's* row count. Select three rows, page
 * to another three-row page, and the header checkbox read as checked with nothing
 * on that page selected — and clicking it then wiped the earlier selection.
 */
export function arraySelection<T>({
  rows,
  getId,
  selectedIds,
  onChange,
}: ArraySelectionOptions<T>): GridSelection<T> {
  const selected = new Set(selectedIds);
  const pageIds = rows.map(getId);
  const selectedOnPage = pageIds.filter((id) => selected.has(id)).length;
  const allSelected = pageIds.length > 0 && selectedOnPage === pageIds.length;

  function setSelected(id: string, on: boolean) {
    if (on === selected.has(id)) return;
    onChange(on ? [...selectedIds, id] : selectedIds.filter((s) => s !== id));
  }

  return {
    isSelected: (row) => selected.has(getId(row)),
    toggle: (row, on) => {
      const id = getId(row);
      setSelected(id, on ?? !selected.has(id));
    },
    allSelected,
    someSelected: selectedOnPage > 0 && !allSelected,
    toggleAll: () => {
      const onPage = new Set(pageIds);
      onChange(
        allSelected
          ? // Clear this page only, leaving other pages' selections alone.
            selectedIds.filter((id) => !onPage.has(id))
          : [...selectedIds, ...pageIds.filter((id) => !selected.has(id))],
      );
    },
  };
}

export interface ControlSelectionOptions<T> {
  /** Holds the selected row ids. */
  selected: Control<string[]>;
  rows: T[];
  getId: (row: T) => string;
}

/**
 * `GridSelection` backed by a `Control<string[]>`.
 *
 * Deliberately not named `use*`: it contains no hooks, and it reads `.value` when
 * called, so it must run on every render and is safe to call conditionally — the
 * opposite of what a `use*` name would promise. Same reasoning as `makeGridSort`
 * and `makeGridFilter`.
 */
export function makeGridSelection<T>({
  selected,
  rows,
  getId,
}: ControlSelectionOptions<T>): GridSelection<T> {
  return arraySelection({
    rows,
    getId,
    selectedIds: selected.value ?? [],
    onChange: (ids) => (selected.value = ids),
  });
}
