import { TextField, TextFieldProps } from "@mui/material";
import { Control, formControlProps } from "@react-typed-forms/core";
import React, { FC } from "react";

export function FDateField(
  props: TextFieldProps & { state: Control<string | undefined | null> },
) {
  const { helperText, state, ...otherProps } = props;
  const { value, errorText, ...formProps } = formControlProps(state);
  return (
    <TextField
      {...formProps}
      value={!value ? "" : value}
      error={Boolean(errorText)}
      {...props}
      type="date"
      helperText={errorText ?? helperText}
      InputLabelProps={{ shrink: true }}
    />
  );
}
