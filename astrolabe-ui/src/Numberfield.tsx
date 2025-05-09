import {
  Control,
  formControlProps,
  useControlEffect,
} from "@react-typed-forms/core";
import { InputHTMLAttributes, useState } from "react";
import clsx from "clsx";

export interface NumberfieldProps
  extends InputHTMLAttributes<HTMLInputElement> {
  control: Control<number | null | undefined>;
  label: string;
  required?: boolean;
  inputClass?: string;
}

export function Numberfield({
  control,
  label,
  required = false,
  className,
  inputClass,
  ...inpProps
}: NumberfieldProps) {
  const id = "c" + control.uniqueId;

  const [field, setField] = useState(makeTextAndValue(control.current.value));

  useControlEffect(
    () => control.value,
    (v) => setField((fv) => (fv[1] === v ? fv : makeTextAndValue(v))),
  );

  const { value, errorText, ...props } = formControlProps(control);

  return (
    <div className={clsx("flex flex-col", className)}>
      <label htmlFor={id} className="font-bold">
        {label}
        {required ? " *" : ""}
      </label>
      <input
        type="number"
        {...props}
        className={inputClass}
        value={field[0]}
        onChange={(e) => {
          const textValue = e.target.value;
          const v = parseFloat(textValue);
          const newValue = isNaN(v) ? null : v;
          setField([textValue, v]);
          control.value = newValue;
        }}
        {...inpProps}
      />
      {errorText && (
        <p className="mt-2 text-sm text-danger-600 dark:text-danger-500">
          {errorText}
        </p>
      )}
    </div>
  );

  function makeTextAndValue(
    value?: number | null,
  ): [string | number, number | null | undefined] {
    return [typeof value === "number" ? value : "", value];
  }
}
