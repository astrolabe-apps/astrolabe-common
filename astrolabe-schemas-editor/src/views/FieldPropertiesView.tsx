import { ViewContext } from "../types";
import { InactiveView } from "./InactiveView";
import React from "react";
import { SchemaFieldEditor } from "./SchemaFieldEditor";

export function FieldPropertiesView({ context }: { context: ViewContext }) {
  const { getCurrentForm } = context;
  const sc = getCurrentForm()?.fields.selectedField.value;
  if (!sc) return <InactiveView>No field selected</InactiveView>;
  return (
    <div className="h-full w-full overflow-auto">
      <SchemaFieldEditor key={sc.id} context={context} schema={sc} />
    </div>
  );
}
