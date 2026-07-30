import React from "react";
import { useControlEffect, useFormControlProps } from "./hooks";
import {Control} from "@astroapps/controls";

// Only allow strings and numbers
export type FselectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  control: Control<string | number | undefined>;
};

export function Fselect({ control, children, ...others }: FselectProps) {
  // Update the HTML5 custom validity whenever the error message is changed/cleared
  useControlEffect(
    () => control.error,
    (s) => (control.element as HTMLSelectElement)?.setCustomValidity(s ?? "")
  );
  const { errorText, readOnly, ...theseProps } = useFormControlProps(control);

  return (
    <select
      {...theseProps}
      // native select has no readOnly, so lock it via disabled instead
      disabled={theseProps.disabled || !!readOnly}
      ref={(r) => {
        control.element = r;
        if (r) r.setCustomValidity(control.current.error ?? "");
      }}
      {...others}
    >
      {children}
    </select>
  );
}
