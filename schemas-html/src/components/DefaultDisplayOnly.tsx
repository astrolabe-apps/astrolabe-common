import React from "react";
import {
  FormRenderer,
  FormStateNode,
  SchemaDataNode,
  SchemaInterface,
} from "@react-typed-forms/schemas";

export function DefaultDisplayOnly({
  dataNode,
  className,
  emptyText,
  noSelection,
  schemaInterface,
  style,
  renderer,
  textClass,
  inline,
  state,
}: {
  dataNode: SchemaDataNode;
  schemaInterface: SchemaInterface;
  className?: string;
  textClass?: string;
  style?: React.CSSProperties;
  inline: boolean;
  renderer: FormRenderer;
  emptyText?: string | null;
  noSelection?: boolean | null;
  state: FormStateNode;
}) {
  const text =
    (schemaInterface.isEmptyValue(
      dataNode.schema.field,
      dataNode.control.value,
    )
      ? emptyText
      : schemaInterface.textValueForData(dataNode)) ?? "";
  const { Div } = renderer.html;
  const mergedStyle = noSelection
    ? { ...style, userSelect: "none" as const }
    : style;
  return (
    <Div
      style={mergedStyle}
      className={className}
      textClass={textClass}
      text={text}
      inline={inline}
    />
  );
}
