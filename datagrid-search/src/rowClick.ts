/**
 * Deciding whether a click on a row was aimed at the row.
 *
 * A grid that selects (or drills in, or expands) on row click has to ignore two
 * kinds of click that land on it without being about it: one the cell's own
 * content already handles, and one that's the end of a text drag. Both are easy
 * to get wrong and invisible in tests that only fire synthetic clicks on the row
 * itself, so the rule lives here and every renderer's row wrapper calls it.
 */

/** Cell content that owns its own clicks, so a row click shouldn't also fire. */
export const interactiveContentSelector =
  "a,button,input,select,textarea,label,[role=button],[role=link],[role=checkbox],[role=radio],[role=switch],[role=menuitem],[contenteditable=true]";

/** The minimum of a click event this needs — React's synthetic event satisfies it. */
export interface RowClickEvent {
  target: EventTarget | null;
  currentTarget: EventTarget | null;
}

/**
 * Whether this click was the user reading rather than clicking — dragging across
 * a cell to select its text ends in a click, which shouldn't flip a checkbox.
 */
function endedTextSelection(within: HTMLElement) {
  if (typeof window === "undefined" || !window.getSelection) return false;
  const selection = window.getSelection();
  return (
    !!selection &&
    !selection.isCollapsed &&
    !!selection.anchorNode &&
    within.contains(selection.anchorNode)
  );
}

/**
 * True when a row-level click handler should do nothing: the click landed on
 * interactive cell content, or it ended a text selection inside the row.
 *
 * `currentTarget` is the row wrapper, so this must be called during the event —
 * React clears synthetic event fields after the handler returns.
 */
export function shouldIgnoreRowClick(event: RowClickEvent): boolean {
  const target = event.target as HTMLElement | null;
  if (target?.closest?.(interactiveContentSelector)) return true;
  const within = event.currentTarget as HTMLElement | null;
  return !!within?.contains && endedTextSelection(within);
}
