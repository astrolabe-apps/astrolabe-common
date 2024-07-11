import { useCalendarCell } from "react-aria";
import { CalendarState, RangeCalendarState } from "react-stately";
import { useRef } from "react";
import {
  CalendarDate,
  getLocalTimeZone,
  isToday,
  parseDateTime,
} from "@internationalized/date";
import React from "react";
import clsx from "clsx";

export interface CalendarCellClasses {
  selectedClass?: string;
  cellClass?: string;
  unavailableClass?: string;
  disabledClass?: string;
  dayClass?: string;
  todayClass?: string;
}

export interface CalendarCellProps extends CalendarCellClasses {
  state: CalendarState | RangeCalendarState;
  date: CalendarDate;
}
export const DefaultCalendarCellClasses = {
  selectedClass: "bg-secondary-400",
  cellClass: "size-8 text-center",
  dayClass: "hover:bg-primary-400 hover:text-white rounded-md",
  todayClass: "border border-black",
  unavailableClass: "",
  disabledClass:
    "text-gray-400 hover:bg-transparent aria-disabled:hover:text-gray-400",
};

export function CalendarCell(props: CalendarCellProps) {
  const { date, state, ...classes } = props;
  const {
    cellClass,
    disabledClass,
    selectedClass,
    unavailableClass,
    dayClass,
    todayClass,
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
  const isCellToday = isToday(date, getLocalTimeZone());
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
          isCellToday && todayClass,
        )}
      >
        {formattedDate}
      </div>
    </td>
  );
}
