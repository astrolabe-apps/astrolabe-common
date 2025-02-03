import { ViewContext } from "./index";
import React from "react";
import { FormSchemaTree } from "../FormSchemaTree";
import { controlNotNull, unsafeRestoreControl } from "@react-typed-forms/core";
import { EditorFormNode } from "../EditorFormNode";
import { defaultControlForField } from "@react-typed-forms/schemas";

export function CurrentSchemaView({ context }: { context: ViewContext }) {
  const { schemaLookup, currentForm } = context;
  const cf = controlNotNull(context.getCurrentForm());
  if (!cf) return <div>No form selected</div>;
  const {
    selectedControl,
    selectedField,
    schemaId: { value: schemaId },
  } = cf.fields;
  const rootSchema = schemaLookup.getSchema(schemaId);
  if (!rootSchema) return <div>Missing schema: {schemaId}</div>;
  return (
    <div className="flex flex-col h-full">
      <FormSchemaTree
        rootSchema={rootSchema}
        onAdd={(c) => {
          const v = selectedControl.fields.form.value;
          if (v instanceof EditorFormNode) {
            v.addChild(defaultControlForField(c.field));
          }
        }}
        selectedControl={selectedControl}
        selected={selectedField}
        className="grow overflow-y-auto overflow-x-hidden"
      />
    </div>
  );
}
