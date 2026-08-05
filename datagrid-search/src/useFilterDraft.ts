/**
 * When a popup's selection reaches the search.
 *
 * Two answers, and the popup shouldn't have to know which it's giving: on every
 * click, or on Apply (the grid's `deferApply`, read off `GridFilter`). So a
 * renderer asks for `values`, calls `toggle`/`clear`/`apply`, and this decides
 * whether each of those touches the search or a draft held here.
 *
 * The draft is seeded once per mount. The standard popup body mounts when the
 * popover opens, which is what gives deferred mode its semantics for free: each
 * open starts from what's actually applied, and closing without Apply discards —
 * no cancel path to write, because nothing was written.
 */
import { useControl } from "@react-typed-forms/core";
import type { ColumnFilter, GridFilter } from "./filter";
import { toggledValues } from "./filter";

export interface UseFilterDraftArgs<T, D = unknown> {
  /** The column's filter config — only `multiple` is read here. */
  filter: ColumnFilter<T>;
  /** The key this column's values live under. */
  field: string;
  /** Where applied values live, and where `deferApply` comes from — `search.filter`. */
  gridFilter: GridFilter<T, D>;
}

export interface FilterDraft {
  /** The values a popup should render as selected. */
  values: string[];
  /**
   * Whether a selection is waiting for `apply()`. Renderers use it for wording,
   * not for behaviour — the methods below already account for it.
   */
  deferred: boolean;
  toggle(value: string, on: boolean): void;
  /** Empties the selection: the draft when deferred, the search otherwise. */
  clear(): void;
  /**
   * Applies a deferred selection. Does nothing in immediate mode, where every
   * change is already applied — so a popup can call it on its Apply button
   * unconditionally and just close afterwards.
   */
  apply(): void;
}

export function useFilterDraft<T, D = unknown>(
  args: UseFilterDraftArgs<T, D>,
): FilterDraft {
  const { filter, field, gridFilter } = args;
  const deferred = gridFilter.deferApply;
  const multiple = filter.multiple ?? true;
  const applied = gridFilter.values(field);

  // Created either way — it's a hook, so it can't be conditional — and simply
  // ignored in immediate mode.
  const draft = useControl<string[]>(applied);
  const values = deferred ? draft.value : applied;

  return {
    values,
    deferred,
    toggle: (value, on) => {
      const next = toggledValues(values, value, on, multiple);
      if (deferred) draft.value = next;
      else gridFilter.setValues(field, next);
    },
    clear: () => {
      if (deferred) draft.value = [];
      // Goes through the search's own clear, which deletes the key rather than
      // storing [] and resets paging.
      else gridFilter.clear(field);
    },
    apply: () => {
      if (deferred) gridFilter.setValues(field, draft.value);
    },
  };
}
