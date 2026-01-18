import {
  CalendarDate,
  getLocalTimeZone,
  parseDate,
  today,
} from "@internationalized/date";
import { ReactElement } from "react";
import { Select, SelectItem } from "@astroapps/aria-base";
import { useDateFormatter } from "react-aria";
import { CalendarState, RangeCalendarState } from "react-stately";
import React from "react";

interface YearItem {
  id: number;
  date: CalendarDate;
  formatted: string;
}

export interface YearDropdownProps {
  state: CalendarState | RangeCalendarState;
  minDate?: string;
  maxDate?: string;
  defaultYearRange?: number;
}

export function YearDropdown({
  state,
  minDate,
  maxDate,
  defaultYearRange = 100,
}: YearDropdownProps): ReactElement {
  let formatter = useDateFormatter({
    year: "numeric",
    timeZone: state.timeZone,
  });

  const currentYear = new Date().getFullYear();

  const minYearOffset = minDate ? currentYear - parseDate(minDate).year : null;
  const maxYearOffset = maxDate ? parseDate(maxDate).year - currentYear : null;

  let years: YearItem[] = [];
  for (
    let i = -(minYearOffset ?? defaultYearRange);
    i <= (maxYearOffset ?? defaultYearRange);
    i++
  ) {
    const currentYear = today(getLocalTimeZone()).year;

    let date = state.focusedDate.set({ year: currentYear + i });
    years.push({
      id: years.length,
      date,
      formatted: formatter.format(date.toDate(state.timeZone)),
    });
  }

  const selectedKey = years.findIndex(
    (year) => year.date.year === state.focusedDate.year,
  );

  return (
    <Select
      aria-label="Year"
      selectedKey={selectedKey}
      style={{ flex: 1, width: "fit-content" }}
      onSelectionChange={(key) => {
        if (typeof key === "number") {
          console.log("setting focused date to", years[key].date);
          state.setFocusedDate(years[key].date);
        }
      }}
      items={years}
    >
      {(item) => <SelectItem>{item.formatted}</SelectItem>}
    </Select>
  );
}
