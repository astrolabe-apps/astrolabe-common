import { Control } from "@react-typed-forms/core";
import React from "react";
import {
  rendererClass,
  SchemaField,
  SchemaInterface,
} from "@react-typed-forms/schemas";

export function DefaultDisplayOnly({
  control,
  className,
  emptyText,
  schemaInterface,
  field,
  style,
}: {
  control: Control<any>;
  field: SchemaField;
  schemaInterface: SchemaInterface;
  className?: string;
  style?: React.CSSProperties;
  emptyText?: string | null;
}) {
  const v = control.value;
  const text =
    (schemaInterface.isEmptyValue(field, v)
      ? emptyText
      : schemaInterface.textValue(field, v)) ?? "";
  return (
    <div style={style} className={className}>
      {text}
    </div>
  );
}
