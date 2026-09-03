import React, { type ReactNode } from "react";
import { Radio, RadioGroup, type RadioProps } from "react-aria-components";
import clsx from "clsx";
import type { FilterOption } from "@astroapps/datagrid-search";
import { GridCheckbox } from "./Checkbox";
import type { AriaDataGridParts } from "./styles";

/** A select-all row above the options. Multi-select only. */
export interface SelectAllProps {
  /** Every option is ticked. */
  checked: boolean;
  /** Some but not all — drawn as a dash, announced as mixed. */
  indeterminate: boolean;
  onToggle(on: boolean): void;
  /** Defaults to "(Select All)", as Excel labels it. */
  label?: string;
}

export interface FilterOptionListProps {
  options: FilterOption[];
  /** Currently selected values. */
  selected: string[];
  onToggle(value: string, on: boolean): void;
  /** Radio group instead of checkboxes. Defaults to multi-select. */
  multiple?: boolean;
  /** Show per-option row counts when the source provided them. Default true. */
  showCounts?: boolean;
  /**
   * Renders a select-all as the first row. Ignored for a radio group, where
   * "all" isn't a state the control can be in.
   */
  selectAll?: SelectAllProps;
  parts: AriaDataGridParts;
}

/**
 * The list that makes up the default filter popup body.
 *
 * Exported on its own so a custom popup can keep the standard list and just add
 * a header, a "select all", or a different empty state.
 *
 * In both modes the option text is a sibling of the control rather than its
 * child, so the count can be styled apart from the label and left out of the
 * accessible name — "doc (12)" would otherwise be what a screen reader announces,
 * and the number moves as the data does.
 */
export function FilterOptionList({
  options,
  selected,
  onToggle,
  multiple = true,
  showCounts = true,
  selectAll,
  parts,
}: FilterOptionListProps) {
  if (!multiple) {
    return (
      <RadioGroup
        className={parts.optionList}
        value={selected[0] ?? ""}
        onChange={(value) => onToggle(value, true)}
      >
        {options.map((option) => (
          <FilterRadio
            key={option.value}
            value={option.value}
            isDisabled={option.disabled}
            className={parts.option}
            parts={parts}
          >
            <span className={parts.optionLabel}>
              {option.label ?? option.value}
            </span>
            <Count option={option} show={showCounts} parts={parts} />
          </FilterRadio>
        ))}
      </RadioGroup>
    );
  }

  return (
    <div className={parts.optionList}>
      {selectAll && (
        // A row like any other, so it scrolls with the list as Excel's does. Its
        // state is computed over whatever options are visible, so a select-all
        // under an active search covers the matches rather than the whole list.
        <div className={clsx(parts.option, parts.optionSelectAll)}>
          <GridCheckbox
            checked={selectAll.checked}
            indeterminate={selectAll.indeterminate}
            onChange={selectAll.onToggle}
            ariaLabel={selectAll.label ?? "(Select All)"}
            parts={parts}
          />
          <span className={parts.optionLabel}>
            {selectAll.label ?? "(Select All)"}
          </span>
        </div>
      )}
      {options.map((option) => (
        <div key={option.value} className={parts.option}>
          <GridCheckbox
            checked={selected.includes(option.value)}
            disabled={option.disabled}
            onChange={(on) => onToggle(option.value, on)}
            ariaLabel={option.label ?? option.value}
            parts={parts}
          />
          <span className={parts.optionLabel}>
            {option.label ?? option.value}
          </span>
          <Count option={option} show={showCounts} parts={parts} />
        </div>
      ))}
    </div>
  );
}

/**
 * A radio drawn as a circle. `Radio` is itself the `<label>`, so the text goes
 * inside it and no separate label element is needed.
 */
function FilterRadio({
  children,
  className,
  parts,
  ...props
}: Omit<RadioProps, "children"> & {
  children: ReactNode;
  parts: AriaDataGridParts;
}) {
  return (
    <Radio {...props} className={clsx(className, "group")}>
      {({ isSelected }) => (
        <>
          <span className={parts.radioBox}>
            {isSelected && <span className={parts.radioDot} />}
          </span>
          {children}
        </>
      )}
    </Radio>
  );
}

function Count({
  option,
  show,
  parts,
}: {
  option: FilterOption;
  show: boolean;
  parts: AriaDataGridParts;
}) {
  if (!show || option.count === undefined) return null;
  return <span className={parts.optionCount}>({option.count})</span>;
}
