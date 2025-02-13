import { Control } from "@react-typed-forms/core";
import React from "react";
import {
  FormRenderer,
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
  renderer,
}: {
  control: Control<any>;
  field: SchemaField;
  schemaInterface: SchemaInterface;
  className?: string;
  style?: React.CSSProperties;
  renderer: FormRenderer;
  emptyText?: string | null;
}) {
  const v = control.value;
  const text =
    (schemaInterface.isEmptyValue(field, v)
      ? emptyText
      : schemaInterface.textValue(field, v)) ?? "";
  // noinspection JSUnusedLocalSymbols
  const h = renderer.h;
  return (
    <div style={style} className={className}>
      {text}
    </div>
  );
}
