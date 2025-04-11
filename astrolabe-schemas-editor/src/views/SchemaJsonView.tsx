import { ViewContext } from "./index";
import { InactiveView } from "./InactiveView";
import { SchemaField, SchemaNode } from "@react-typed-forms/schemas";
import React from "react";
import {
  Control,
  controlNotNull,
  useComputed,
  useControl,
  useControlEffect,
  useDebounced,
} from "@react-typed-forms/core";
import { JsonEditor } from "../JsonEditor";
import { EditorSchemaTree } from "../EditorSchemaTree";

export function SchemaJsonView({ context }: { context: ViewContext }) {
  const cf = controlNotNull(context.getCurrentForm());
  if (!cf) return <InactiveView>No form selected</InactiveView>;
  const {
    schema: { value: rootSchema },
  } = cf.fields;
  return (
    <div className="flex flex-col h-full">
      <SchemaJson root={rootSchema.getRootFields()} />
    </div>
  );
}

function SchemaJson({ root }: { root: Control<SchemaField[]> }) {
  const jsonControl = useControl(() =>
    JSON.stringify(root.current.value, null, 2),
  );
  useControlEffect(
    () => root.value,
    (x) => (jsonControl.value = JSON.stringify(x, null, 2)),
  );
  useControlEffect(() => jsonControl.value, useDebounced(updateFields, 300));

  return <JsonEditor className="h-full m-4 border" control={jsonControl} />;

  function updateFields(json: string) {
    try {
      root.value = JSON.parse(json);
    } catch (e) {}
  }
}
