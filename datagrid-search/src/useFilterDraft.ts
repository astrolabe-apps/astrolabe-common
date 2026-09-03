/**
 * When a popup's selection reaches the search, and what a tick means.
 *
 * Three answers, and the popup shouldn't have to know which it's giving — see
 * `FilterMode`. A renderer asks for `values`, calls `toggle`/`setAll`/`clear`/
 * `apply`, and reads `canApply`/`canClear` for its buttons; this decides whether
 * each of those touches the search or a draft held here.
 *
 * The draft is seeded once per mount. The standard popup body mounts when the
 * popover opens, which is what gives the deferred modes their semantics for
 * free: each open starts from what's actually applied, and closing without Apply
 * discards — no cancel path to write, because nothing was written.
 *
 * ## Excel mode
 *
 * Excel inverts the display: an unfiltered column shows every value ticked, not
 * none. The storage doesn't change — an absent key still means "unfiltered" —
 * so this is a presentation layer over the same `string[]`:
 *
 * | applied     | shown as        | apply writes                        |
 * | ----------- | --------------- | ----------------------------------- |
 * | absent      | everything tick | nothing, if still everything        |
 * | `["doc"]`   | just `doc`      | `["doc"]`                           |
 * | —           | nothing ticked  | refused (`canApply` false)          |
 *
 * "Nothing ticked" is refused rather than stored because the empty array is
 * already spoken for: it's what an absent filter reads as, so "match none" and
 * "match everything" would be the same value. Excel refuses it too.
 */
import { useControl } from "@react-typed-forms/core";
import type { ColumnFilter, GridFilter } from "./filter";
import { toggledValues } from "./filter";
import type { FilterOption } from "./types";

export interface UseFilterDraftArgs<T, D = unknown> {
  /** The column's filter config — only `multiple` is read here. */
  filter: ColumnFilter<T>;
  /** The key this column's values live under. */
  field: string;
  /** Where applied values live, and where the mode comes from — `search.filter`. */
  gridFilter: GridFilter<T, D>;
  /**
   * The column's loaded options. Only excel mode reads them — it needs to know
   * what "everything" is, both to seed the display and to recognise a selection
   * that isn't narrowing anything. Safe to pass while still loading: an empty
   * list simply leaves nothing ticked and `canApply` false until they arrive.
   */
  options?: FilterOption[];
}

export interface FilterDraft {
  /** The values a popup should render as selected. */
  values: string[];
  /**
   * Whether a selection is waiting for `apply()`. Renderers use it for wording,
   * not for behaviour — the methods below already account for it.
   */
  deferred: boolean;
  /** True in excel mode: show a select-all, and seed unfiltered as all-ticked. */
  excel: boolean;
  toggle(value: string, on: boolean): void;
  /**
   * Ticks or unticks a whole set at once — what a select-all is wired to. Pass
   * the *visible* options, so a select-all under an active search affects the
   * matches rather than the whole list, as Excel's does.
   */
  setAll(values: string[], on: boolean): void;
  /**
   * Resets the column to unfiltered: empties the selection in the plain modes,
   * and ticks everything in excel mode, which is the same thing said the other
   * way round. Writes the search directly in immediate mode.
   */
  clear(): void;
  /**
   * Whether `apply()` would be allowed. Only ever false in excel mode, with
   * nothing ticked — see this module's header.
   */
  canApply: boolean;
  /** Whether `clear()` would change anything, for disabling a Clear button. */
  canClear: boolean;
  /**
   * Applies a deferred selection. Does nothing in immediate mode, where every
   * change is already applied — so a popup can call it on its Apply button
   * unconditionally and just close afterwards. Does nothing when `canApply` is
   * false, so a renderer that fails to disable its button can't write a
   * selection that means "match none".
   */
  apply(): void;
}

export function useFilterDraft<T, D = unknown>(
  args: UseFilterDraftArgs<T, D>,
): FilterDraft {
  const { filter, field, gridFilter, options = [] } = args;
  const mode = gridFilter.mode;
  const deferred = mode !== "immediate";
  // An excel-style select-all over a radio group is meaningless, so a
  // single-select column keeps the plain behaviour whatever the grid is set to.
  const multiple = filter.multiple ?? true;
  const excel = mode === "excel" && multiple;
  const applied = gridFilter.values(field);

  // Every value the column offers. Disabled options are included: they're still
  // part of "everything", and leaving them out would make a list containing one
  // impossible to fully tick.
  const all = options.map((o) => o.value);

  // Seeded once per mount, so an applied value changing underneath an open popup
  // doesn't rewrite what the user is looking at.
  const openedWith = useControl<string[]>(applied).value;
  // `null` until something is touched, rather than a copy of the seed: in excel
  // mode the baseline is "everything", which isn't known yet if the options are
  // still loading. Reading through the null keeps the display correct when they
  // land, without an effect to re-seed.
  const edited = useControl<string[] | null>(null);

  // Created either way — hooks can't be conditional — and ignored in immediate
  // mode, where the search itself is the state.
  const baseline = excel && openedWith.length === 0 ? all : openedWith;
  const values = deferred ? (edited.value ?? baseline) : applied;

  const selected = new Set(values);
  // Whether the selection still lets every available value through, i.e. isn't
  // narrowing anything. Extra values that no longer appear in the options — a
  // stale filter out of a URL — don't count against it; they match no rows
  // either way.
  const allSelected = all.length > 0 && all.every((v) => selected.has(v));
  const canApply = !excel || values.length > 0;

  function write(next: string[]) {
    if (deferred) edited.value = next;
    else gridFilter.setValues(field, next);
  }

  return {
    values,
    deferred,
    excel,
    canApply,
    canClear: excel ? all.length > 0 && !allSelected : values.length > 0,
    toggle: (value, on) => write(toggledValues(values, value, on, multiple)),
    setAll: (subset, on) => {
      if (!multiple) return;
      // Array methods rather than a Set the result is spread out of: microbundle
      // compiles `[...set]` to `[].concat(set)`, which wraps the Set instead of
      // expanding it. Sets are only used for membership tests here.
      if (!on) {
        const dropping = new Set(subset);
        write(values.filter((v) => !dropping.has(v)));
        return;
      }
      const held = new Set(values);
      // Appended, so ticking a select-all leaves the existing order alone.
      write(values.concat(subset.filter((v) => !held.has(v))));
    },
    clear: () => {
      // Excel's "unfiltered" is every box ticked; everywhere else it's none.
      if (excel) edited.value = all.slice();
      else if (deferred) edited.value = [];
      // Goes through the search's own clear, which deletes the key rather than
      // storing [] and resets paging.
      else gridFilter.clear(field);
    },
    apply: () => {
      if (!deferred || !canApply) return;
      // Everything ticked is not a filter — store nothing, so the funnel goes
      // idle and the field leaves no trace in URLs or query keys.
      gridFilter.setValues(field, excel && allSelected ? [] : values);
    },
  };
}
