import { Field, type FieldProps } from "@fluentui/react-components";
import type { Control } from "@react-typed-forms/core";
import type { ReactElement } from "react";

export interface FFieldProps
  extends Omit<
    FieldProps,
    "validationState" | "validationMessage" | "children"
  > {
  control: Control<unknown>;
  children: ReactElement;
}

/**
 * Wraps a FluentUI `Field`, deriving `validationState`/`validationMessage`
 * from the control's `touched`/`error` state. Combine with a `C*` input.
 */
export function FField({ control, children, ...rest }: FFieldProps) {
  const error = control.touched ? control.error : null;
  return (
    <Field
      validationState={error ? "error" : "none"}
      validationMessage={error ?? undefined}
      {...rest}
    >
      {children}
    </Field>
  );
}
