import React from "react";
import {
  FormRenderer,
  FormStateNode,
  SchemaDataNode,
  SchemaInterface,
} from "@react-typed-forms/schemas";
import { RNDiv } from "../StdComponents";

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
  return (
    <RNDiv
      style={style}
      className={className}
      textClass={textClass}
      text={text}
      inline={inline}
      selectable={!noSelection}
    />
  );
}
