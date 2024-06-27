import { useCalendarCell } from "react-aria";
import { CalendarState, RangeCalendarState } from "react-stately";
import { useRef } from "react";
import { CalendarDate } from "@internationalized/date";
import React from "react";
import clsx from "clsx";

export interface CalendarCellClasses {
  selectedClass?: string;
  cellClass?: string;
  unavailableClass?: string;
  disabledClass?: string;
  dayClass?: string;
}

export interface CalendarCellProps extends CalendarCellClasses {
  state: CalendarState | RangeCalendarState;
  date: CalendarDate;
}
export const DefaultCalendarCellClasses = {
  selectedClass: "bg-secondary-400",
  cellClass: "w-8 h-8 text-center",
  dayClass: "hover:bg-primary-400 hover:text-white rounded-md",
  unavailableClass: "",
  disabledClass: "",
};

export function CalendarCell(props: CalendarCellProps) {
  const { date, state, ...classes } = props;
  const {
    cellClass,
    disabledClass,
    selectedClass,
    unavailableClass,
    dayClass,
  } = {
    ...DefaultCalendarCellClasses,
    ...classes,
  };
  let ref = useRef(null);
  let {
    cellProps,
    buttonProps,
    isSelected,
    isOutsideVisibleRange,
    isDisabled,
    isUnavailable,
    formattedDate,
  } = useCalendarCell({ date }, state, ref);

  return (
    <td {...cellProps} className={cellClass}>
      <div
        {...buttonProps}
        ref={ref}
        hidden={isOutsideVisibleRange}
        className={clsx(
          dayClass,
          isSelected && selectedClass,
          isDisabled && disabledClass,
          isUnavailable && unavailableClass,
        )}
      >
        {formattedDate}
      </div>
    </td>
  );
}
