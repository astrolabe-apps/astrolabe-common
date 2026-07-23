import React from "react";
import { useControlEffect, useFormControlProps } from "./hooks";
import { Control } from "@astroapps/controls";

export type FcheckboxProps = React.InputHTMLAttributes<HTMLInputElement> & {
  control: Control<boolean | undefined | null>;
  type?: "checkbox" | "radio";
  notValue?: boolean;
};

export function Fcheckbox({
  control,
  type = "checkbox",
  notValue = false,
  ...others
}: FcheckboxProps) {
  // Update the HTML5 custom validity whenever the error message is changed/cleared
  useControlEffect(
    () => control.error,
    (s) => (control.element as HTMLInputElement)?.setCustomValidity(s ?? ""),
  );
  const { value, onChange, errorText, readOnly, ...theseProps } =
    useFormControlProps(control);
  return (
    <input
      {...theseProps}
      // native checkbox ignores readOnly, so lock it via disabled instead
      disabled={theseProps.disabled || !!readOnly}
      checked={!!value !== notValue}
      ref={(r) => {
        control.element = r;
        if (r) r.setCustomValidity(control.current.error ?? "");
      }}
      onChange={(e) => (control.value = e.target.checked !== notValue)}
      type={type}
      {...others}
    />
  );
}
