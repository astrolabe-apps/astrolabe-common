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
  const nonNull = cf;
  const schemaId = cf.fields.schemaId.value;
  const rootSchema = schemaLookup.getSchema(schemaId);
  if (!rootSchema) return <div>Missing schema: {schemaId}</div>;
  return (
    <div className="flex flex-col h-full">
      <FormSchemaTree
        rootSchema={rootSchema}
        onAdd={(c) => {
          const v = nonNull.fields.selectedControl.fields.form.value;
          console.log(v);
          if (v instanceof EditorFormNode) {
            v.addChild(defaultControlForField(c.field));
          }
        }}
        selectedControl={cf.fields.selectedControl}
        selected={cf.fields.selectedField}
        className="grow overflow-y-auto overflow-x-hidden"
      />
    </div>
  );
}
