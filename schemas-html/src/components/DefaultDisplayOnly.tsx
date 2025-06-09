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
  state: FormStateNode;
}) {
  const { display } = state.resolved;
  const text =
    display != null
      ? display
      : ((schemaInterface.isEmptyValue(
          dataNode.schema.field,
          dataNode.control.value,
        )
          ? emptyText
          : schemaInterface.textValueForData(dataNode)) ?? "");
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
