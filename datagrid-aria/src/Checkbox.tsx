/**
 * The one primitive this package can't borrow.
 *
 * `@astroapps/aria-base` has a Button, Popover, ListBox and Select but no
 * Checkbox, and a grid needs one that can be indeterminate — the "some of this
 * page is selected" header state. React Aria's `Checkbox` gives that plus the
 * hidden-input plumbing and focus handling; the square is drawn here.
 *
 * It renders a `<label>` around that input, which is also why a row click doesn't
 * double-fire: `shouldIgnoreRowClick` treats both as content that owns its click.
 */
import React from "react";
import { Checkbox as AriaCheckbox } from "react-aria-components";
import { mergeClasses } from "./mergeClasses";
import { CheckIcon, DashIcon } from "./icons";
import type { AriaDataGridParts } from "./styles";

export interface GridCheckboxProps {
  checked: boolean;
  /** Draws a dash instead of a tick, and reports `mixed` to assistive tech. */
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  /** Required: these never have a visible label of their own. */
  ariaLabel: string;
  disabled?: boolean;
  parts: Pick<
    AriaDataGridParts,
    "checkbox" | "checkboxBox" | "checkboxBoxSelected"
  >;
}

export function GridCheckbox({
  checked,
  indeterminate,
  onChange,
  ariaLabel,
  disabled,
  parts,
}: GridCheckboxProps) {
  return (
    <AriaCheckbox
      aria-label={ariaLabel}
      isSelected={checked}
      isIndeterminate={indeterminate}
      isDisabled={disabled}
      onChange={onChange}
      className={parts.checkbox}
    >
      {({ isSelected, isIndeterminate }) => (
        <span
          // Merged, not concatenated: `checkboxBoxSelected`'s background and
          // border have to beat the unselected ones, and tailwind emits them in
          // the losing order.
          className={mergeClasses(
            parts.checkboxBox,
            (isSelected || isIndeterminate) && parts.checkboxBoxSelected,
          )}
        >
          {isIndeterminate ? <DashIcon /> : isSelected ? <CheckIcon /> : null}
        </span>
      )}
    </AriaCheckbox>
  );
}
