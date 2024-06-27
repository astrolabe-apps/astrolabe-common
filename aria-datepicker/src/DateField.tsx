import {
  DateFieldState,
  DateSegment,
  useDateFieldState,
  useTimeFieldState,
} from "react-stately";
import {
  AriaDateFieldProps,
  useDateField,
  useDateSegment,
  useLocale,
} from "react-aria";
import { createCalendar, Time } from "@internationalized/date";
import React, { useRef } from "react";

export function DateField(props: AriaDateFieldProps<any>) {
  let { locale } = useLocale();
  let state = useDateFieldState({
    ...props,
    locale,
    createCalendar,
  });

  let ref = useRef(null);
  let { labelProps, fieldProps } = useDateField(props, state, ref);

  return (
    <div>
      <span {...labelProps}>{props.label}</span>
      <div {...fieldProps} ref={ref} className="flex">
        {state.segments.map((segment, i) => (
          <DateSegmentC key={i} segment={segment} state={state} />
        ))}
        {state.isInvalid && <span aria-hidden="true">🚫</span>}
      </div>
    </div>
  );
}

function DateSegmentC({
  segment,
  state,
}: {
  segment: DateSegment;
  state: DateFieldState;
}) {
  let ref = useRef(null);
  let { segmentProps } = useDateSegment(segment, state, ref);

  return (
    <div
      {...segmentProps}
      ref={ref}
      className={`segment ${segment.isPlaceholder ? "placeholder" : ""}`}
    >
      {segment.text}
    </div>
  );
}
