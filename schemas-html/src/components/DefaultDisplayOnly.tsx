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
  textClass,
  inline,
}: {
  control: Control<any>;
  field: SchemaField;
  schemaInterface: SchemaInterface;
  className?: string;
  textClass?: string;
  style?: React.CSSProperties;
  inline: boolean;
  renderer: FormRenderer;
  emptyText?: string | null;
}) {
  const v = control.value;
  const text =
    (schemaInterface.isEmptyValue(field, v)
      ? emptyText
      : schemaInterface.textValue(field, v)) ?? "";
  const { Div } = renderer.html;
  return (
    <Div
      style={style}
      className={className}
      textClass={textClass}
      text={text}
      inline={inline}
    />
  );
}
