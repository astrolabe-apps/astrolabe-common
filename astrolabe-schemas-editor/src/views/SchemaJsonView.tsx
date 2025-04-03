import { ViewContext } from "./index";
import { InactiveView } from "./InactiveView";
import { SchemaField, SchemaNode } from "@react-typed-forms/schemas";
import React from "react";
import {
  controlNotNull,
  useComputed,
  useControl,
} from "@react-typed-forms/core";
import { JsonEditor } from "../JsonEditor";

export function SchemaJsonView({ context }: { context: ViewContext }) {
  const cf = controlNotNull(context.getCurrentForm());
  if (!cf) return <InactiveView>No form selected</InactiveView>;
  const {
    schema: { value: rootSchema },
  } = cf.fields;
  return (
    <div className="flex flex-col h-full">
      <SchemaJson root={rootSchema} />
    </div>
  );
}

function SchemaJson({ root }: { root: SchemaNode }) {
  const jsonControl = useComputed(() =>
    JSON.stringify(root.getUnresolvedFields(), null, 2),
  );
  return <JsonEditor className="h-full m-4 border" control={jsonControl} />;
}
