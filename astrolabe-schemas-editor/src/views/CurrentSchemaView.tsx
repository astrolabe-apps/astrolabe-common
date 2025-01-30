import { ViewContext } from "./index";
import React from "react";
import { FormSchemaTree } from "../FormSchemaTree";

export function CurrentSchemaView({ context }: { context: ViewContext }) {
  const { schemaLookup, currentForm } = context;
  const cf = context.getCurrentForm();
  // const formId = currentForm.value;
  // const formTree = formId ? context.getForm(formId) : undefined;
  const schemaId = cf?.fields.schemaId.value;
  const rootSchema = schemaId ? schemaLookup.getSchema(schemaId) : undefined;
  const rootControls = formTree?.fields.rootNode.value;
  if (!rootControls) return <div>Select a form</div>;
  if (!rootSchema) return <div>Missing schema: {schemaId}</div>;
  return (
    <FormSchemaTree
      rootSchema={rootSchema}
      onAdd={() => {}}
      selectedControl={selectedControl}
      selected={selectedField}
    />
  );
}
