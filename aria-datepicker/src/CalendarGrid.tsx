import { AriaCalendarGridProps, useCalendarGrid, useLocale } from "react-aria";
import { getWeeksInMonth } from "@internationalized/date";
import {
  CalendarCell,
  CalendarCellClasses,
  DefaultCalendarCellClasses,
} from "./CalendarCell";
import { CalendarState } from "react-stately";
import React from "react";
import clsx from "clsx";

export interface CalendarGridClasses extends CalendarCellClasses {
  gridClass?: string;
  headerCellClass?: string;
}

export const DefaultCalendarGridClasses = {
  ...DefaultCalendarCellClasses,
  gridClass: "w-full",
} satisfies CalendarGridClasses;

export interface CalendarGridProps
  extends AriaCalendarGridProps,
    CalendarGridClasses {
  state: CalendarState;
}
export function CalendarGrid({ state, ...props }: CalendarGridProps) {
  let { locale } = useLocale();
  let { gridProps, headerProps, weekDays } = useCalendarGrid(props, state);

  // Get the number of weeks in the month so we can render the proper number of rows.
  let weeksInMonth = getWeeksInMonth(state.visibleRange.start, locale);
  const { gridClass, headerCellClass, ...cellClasses } = {
    ...DefaultCalendarGridClasses,
    ...props,
  };
  return (
    <table {...gridProps} className={gridClass}>
      <thead {...headerProps}>
        <tr>
          {weekDays.map((day, index) => (
            <th
              key={index}
              className={clsx(cellClasses.cellClass, headerCellClass)}
            >
              {day}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: weeksInMonth }, (_, weekIndex) => (
          <tr key={weekIndex}>
            {state
              .getDatesInWeek(weekIndex)
              .map((date, i) =>
                date ? (
                  <CalendarCell
                    key={i}
                    state={state}
                    date={date}
                    {...cellClasses}
                  />
                ) : (
                  <td key={i} />
                ),
              )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
