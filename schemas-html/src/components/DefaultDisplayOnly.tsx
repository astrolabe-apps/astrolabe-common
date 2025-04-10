import { Control } from "@react-typed-forms/core";
import React from "react";
import {
  FormRenderer,
  SchemaDataNode,
  SchemaField,
  SchemaInterface,
} from "@react-typed-forms/schemas";

export function DefaultDisplayOnly({
  dataNode,
  className,
  emptyText,
  schemaInterface,
  style,
  renderer,
  textClass,
  inline,
}: {
  dataNode: SchemaDataNode;
  schemaInterface: SchemaInterface;
  className?: string;
  textClass?: string;
  style?: React.CSSProperties;
  inline: boolean;
  renderer: FormRenderer;
  emptyText?: string | null;
}) {
  const text =
    (schemaInterface.isEmptyValue(dataNode.schema.field, dataNode.control.value)
      ? emptyText
      : schemaInterface.textValueForData(dataNode)) ?? "";
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
