import { ViewContext } from "./index";
import React from "react";
import { FormSchemaTree } from "../FormSchemaTree";
import { controlNotNull } from "@react-typed-forms/core";

export function CurrentSchemaView({ context }: { context: ViewContext }) {
  const { schemaLookup, currentForm } = context;
  const cf = controlNotNull(context.getCurrentForm());
  if (!cf) return <div>No form selected</div>;
  const schemaId = cf.fields.schemaId.value;
  const rootSchema = schemaLookup.getSchema(schemaId);
  if (!rootSchema) return <div>Missing schema: {schemaId}</div>;
  return (
    <FormSchemaTree
      rootSchema={rootSchema}
      onAdd={() => {}}
      selectedControl={cf.fields.selectedControl}
      selected={cf.fields.selectedField}
    />
  );
}
