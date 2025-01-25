import { ViewContext } from "./index";
import { FormControlTree } from "../FormControlTree";
import React from "react";

export function FormStructureView({ context }: { context: ViewContext }) {
  const { selectedField, schemaLookup, currentForm, selectedControl } = context;
  const formId = currentForm.value;
  const formTree = formId ? context.getForm(formId) : undefined;
  const schemaId = formTree?.fields.schemaId.value;
  const rootSchema = schemaId ? schemaLookup.getSchema(schemaId) : undefined;
  const rootControls = formTree?.fields.rootNode.value;
  if (!rootControls) return <div>Select a form</div>;
  if (!rootSchema) return <div>Missing schema: {schemaId}</div>;

  return (
    <FormControlTree
      rootNode={rootControls}
      rootSchema={rootSchema}
      selected={selectedControl}
      selectedField={selectedField}
      onDeleted={() => {}}
    />
  );
}
