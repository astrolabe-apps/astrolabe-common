import { getEditorFormTree, ViewContext } from "./index";
import React from "react";
import { FormSchemaTree } from "../FormSchemaTree";
import { controlNotNull, unsafeRestoreControl } from "@react-typed-forms/core";
import { EditorFormNode } from "../EditorFormNode";
import { defaultControlForField } from "@react-typed-forms/schemas";
import { InactiveView } from "./InactiveView";

export function CurrentSchemaView({ context }: { context: ViewContext }) {
  const { schemaLookup } = context;
  const cf = controlNotNull(context.getCurrentForm());
  if (!cf) return <InactiveView>No form selected</InactiveView>;
  const {
    selectedControl,
    selectedField,
    schemaId: { value: schemaId },
    selectedControlId,
  } = cf.fields;
  const rootSchema = schemaLookup.getSchema(schemaId);
  const tree = getEditorFormTree(cf);
  if (!rootSchema) return <div>Missing schema: {schemaId}</div>;
  return (
    <div className="flex flex-col h-full">
      <FormSchemaTree
        rootSchema={rootSchema}
        onAdd={(c) => {
          const v = selectedControl.fields.form.value ?? tree.rootNode;
          if (v instanceof EditorFormNode) {
            const newNode = v.addChild(defaultControlForField(c.field));
            selectedControlId.value = newNode.uniqueId.toString();
          }
        }}
        selectedControl={selectedControl}
        selected={selectedField}
        className="grow overflow-y-auto overflow-x-hidden"
      />
    </div>
  );
}
