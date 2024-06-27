import {
  createDataRenderer,
  DataRenderType,
  DateTimeRenderOptions,
  FieldType,
} from "@react-typed-forms/schemas";
import { DatePicker } from "@astroapps/aria-datepicker";
import React from "react";
import { rendererClass } from "@react-typed-forms/schemas";
import { Control } from "@react-typed-forms/core";
import {
  CalendarDateTime,
  parseAbsolute,
  parseDate,
  toCalendarDateTime,
  toZoned,
} from "@internationalized/date";
import { DatePickerClasses } from "@astroapps/aria-datepicker/lib";

export const DefaultDatePickerClass =
  "flex border border-black w-full pl-3 py-2 space-x-4";

export function createDatePickerRenderer(
  className: string = DefaultDatePickerClass,
  classes?: DatePickerClasses,
) {
  return createDataRenderer(
    (p) => (
      <DatePickerRenderer
        dateTime={p.field.type == FieldType.DateTime}
        classes={{
          ...classes,
          className: rendererClass(p.className, className),
        }}
        control={p.control}
        readonly={p.readonly}
        options={p.renderOptions as DateTimeRenderOptions}
      />
    ),
    {
      schemaType: [FieldType.Date, FieldType.DateTime],
      renderType: DataRenderType.DateTime,
    },
  );
}

function DatePickerRenderer({
  dateTime,
  classes,
  id,
  control,
  readonly,
  options = {},
}: {
  control: Control<string | null>;
  classes?: DatePickerClasses;
  readonly?: boolean;
  id?: string;
  dateTime?: boolean;
  options?: Omit<DateTimeRenderOptions, "type">;
}) {
  const disabled = control.disabled;
  let dateValue: CalendarDateTime | null = null;
  try {
    dateValue = !control.value
      ? null
      : dateTime
        ? toCalendarDateTime(parseAbsolute(control.value, "UTC"))
        : toCalendarDateTime(parseDate(control.value));
  } catch (e) {
    console.log(e);
  }

  return (
    <DatePicker
      {...classes}
      isDisabled={disabled}
      isReadOnly={readonly}
      value={dateValue}
      label={"FIXME"}
      granularity={dateTime && !options.forceMidnight ? "minute" : "day"}
      onChange={(c) => {
        control.touched = true;
        control.value = c
          ? dateTime
            ? toZoned(c, "UTC").toAbsoluteString()
            : c.toString()
          : null;
      }}
    />
  );
}
