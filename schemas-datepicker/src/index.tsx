import {
  createDataRenderer,
  DataRenderType,
  DateTimeRenderOptions,
  FieldType,
  isDateTimeRenderer,
  rendererClass,
} from "@react-typed-forms/schemas";
import { DatePicker } from "@astroapps/aria-datepicker";
import React from "react";
import { Control } from "@react-typed-forms/core";
import {
  CalendarDateTime,
  getLocalTimeZone,
  parseAbsolute,
  parseDate,
  toCalendarDate,
  toCalendarDateTime,
  toZoned,
} from "@internationalized/date";
import { DatePickerClasses } from "@astroapps/aria-datepicker/lib";

export const DefaultDatePickerClass =
  "flex border border-black w-full pl-3 py-2 space-x-4";

export interface DatePickerOptions extends DatePickerClasses {
  portalContainer?: Element;
}

export function createDatePickerRenderer(
  className: string = DefaultDatePickerClass,
  pickerOptions?: DatePickerOptions,
) {
  return createDataRenderer(
    (p) => (
      <DatePickerRenderer
        dateTime={p.field.type == FieldType.DateTime}
        pickerOptions={pickerOptions}
        className={rendererClass(p.className, className)}
        control={p.control.as()}
        readonly={p.readonly}
        designMode={p.designMode}
        options={p.renderOptions as DateTimeRenderOptions}
      />
    ),
    {
      schemaType: [FieldType.Date, FieldType.DateTime],
      renderType: DataRenderType.DateTime,
      match: (p, renderOptions) =>
        !isDateTimeRenderer(renderOptions) || !renderOptions.forceStandard,
    },
  );
}

function DatePickerRenderer({
  dateTime,
  className,
  id,
  control,
  readonly,
  designMode,
  options = {},
  pickerOptions,
}: {
  control: Control<string | null>;
  className?: string;
  readonly?: boolean;
  designMode?: boolean;
  id?: string;
  dateTime?: boolean;
  options?: Omit<DateTimeRenderOptions, "type">;
  pickerOptions?: DatePickerOptions;
}) {
  const { portalContainer, ...classes } = pickerOptions ?? {};
  const disabled = control.disabled;
  let dateValue: CalendarDateTime | null = null;
  try {
    dateValue = !control.value
      ? null
      : dateTime
        ? toCalendarDateTime(parseAbsolute(control.value, getLocalTimeZone()))
        : toCalendarDateTime(parseDate(control.value));
  } catch (e) {
    console.log(e);
  }

  return (
    <DatePicker
      {...classes}
      className={className}
      portalContainer={portalContainer}
      isDisabled={disabled}
      isReadOnly={readonly}
      value={dateValue}
      label={"FIXME"}
      granularity={dateTime && !options.forceMidnight ? "minute" : "day"}
      designMode={designMode}
      onChange={(c) => {
        control.touched = true;
        control.value = c
          ? dateTime
            ? toZoned(c, getLocalTimeZone()).toAbsoluteString()
            : toCalendarDate(c).toString()
          : null;
      }}
    />
  );
}
