import { Control } from "@react-typed-forms/core";
import { SchemaField, SchemaInterface } from "../types";
import React from "react";
import { rendererClass } from "../util";

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
  className?: string | null;
  style?: React.CSSProperties;
  emptyText?: string | null;
}) {
  const v = control.value;
  const text =
    (schemaInterface.isEmptyValue(field, v)
      ? emptyText
      : schemaInterface.textValue(field, v)) ?? "";
  return (
    <div style={style} className={rendererClass(className)}>
      {text}
    </div>
  );
}
