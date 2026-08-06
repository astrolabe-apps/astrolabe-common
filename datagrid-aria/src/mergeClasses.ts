/**
 * Compose tailwind class strings so the *last* one wins.
 *
 * `clsx` alone is not enough, and the failure is silent. It concatenates, leaving
 * both utilities in the class attribute, and the winner is then decided by which
 * rule tailwind emitted later — which is neither the order you wrote them in nor
 * anything you can see at the call site. Under the astrolabe preset,
 * `.bg-primary-600` is emitted *before* `.bg-white`, so
 * `clsx("bg-white", selected && "bg-primary-600")` leaves a selected checkbox
 * white. With `text-white` on it for the tick, that's a white tick on a white box:
 * the state renders, invisibly.
 *
 * So: `clsx` for the conditionals, `tailwind-merge` to resolve what they produced.
 * Exported because a caller building custom cells out of `parts` needs the same
 * thing.
 *
 * Note this only helps within one class string. Where a class has to beat one
 * `@astroapps/datagrid` will `clsx` onto the same element from a different prop —
 * the selection column's padding against the base cell's, a dense row's missing
 * divider against the base cell's — the override is marked `!` instead, since
 * nothing here gets to reorder that concatenation.
 */
import clsx, { type ClassValue } from "clsx";
import { extendTailwindMerge, validators } from "tailwind-merge";

/**
 * tailwind-merge 3.x describes **Tailwind v4**, where a bare `outline` sets
 * `outline-width: 1px`. This repo is on Tailwind v3, where it sets
 * `outline-style: solid` — so `outline outline-2` is one style plus one width, and
 * both are needed: a width with no style paints nothing, since `outline-style`
 * defaults to `none`.
 *
 * Left alone, tailwind-merge reads that pair as two widths and drops the first,
 * quietly removing the focus ring from every part it merges — including any part a
 * consumer overrides. So the two groups are corrected here: bare `outline` is a
 * style, and only the numeric and arbitrary forms are widths.
 *
 * Delete this when the repo moves to Tailwind v4.
 */
const twMerge = extendTailwindMerge({
  override: {
    classGroups: {
      "outline-style": [
        // Tailwind v3's outline-style utilities, `outline` among them.
        { outline: ["", "dashed", "dotted", "double", "none", "hidden"] },
      ],
      // The default group minus the bare `outline` that moved above.
      "outline-w": [
        {
          outline: [
            validators.isNumber,
            validators.isArbitraryLength,
            validators.isArbitraryVariableLength,
          ],
        },
      ],
    },
  },
});

export function mergeClasses(...classes: ClassValue[]): string {
  return twMerge(clsx(...classes));
}
