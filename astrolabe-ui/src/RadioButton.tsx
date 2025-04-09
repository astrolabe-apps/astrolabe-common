import {
  Control,
  formControlProps,
  useControlEffect,
} from "@react-typed-forms/core";
import { ReactElement } from "react";
type NumberControl = {
  control: Control<number | undefined | null>;
  value: number;
  isNumber: true;
};

type StringControl = {
  control: Control<string | undefined | null>;
  value: string;
  isNumber?: never;
};

type RadioDiscriminator = NumberControl | StringControl;

type RadioButtonProps = React.HTMLProps<HTMLInputElement> & {
  disabled?: boolean;
  className?: string;
} & RadioDiscriminator;

export function RadioButton({
  control,
  value,
  disabled,
  className,
  isNumber,
}: RadioButtonProps): ReactElement {
  const {
    errorText,
    value: defValue,
    ...props
  } = isNumber
    ? formControlProps<number | undefined | null, HTMLInputElement>(control)
    : formControlProps<string | undefined | null, HTMLInputElement>(control);

  useControlEffect(
    () => control.value,
    (controlChange) => {
      if (!isNumber) return;
      control.value = Number(controlChange);
    },
  );

  return (
    <input
      {...props}
      className={className}
      type="radio"
      name={"radio-" + control.uniqueId}
      value={value}
      checked={value === defValue}
      disabled={props.disabled || disabled}
    />
  );
}
