import { ViewContext } from "./index";
import React from "react";
import { FormSchemaTree } from "../FormSchemaTree";
import { controlNotNull } from "@react-typed-forms/core";
import { defaultControlForField } from "@react-typed-forms/schemas";
import { InactiveView } from "./InactiveView";

export function CurrentSchemaView({ context }: { context: ViewContext }) {
  const cf = controlNotNull(context.getCurrentForm());
  if (!cf) return <InactiveView>No form selected</InactiveView>;
  const {
    selectedControl,
    selectedField,
    schema: { value: rootSchema },
    selectedControlId,
    formTree: { value: tree },
  } = cf.fields;
  return (
    <div className="flex flex-col h-full">
      <FormSchemaTree
        rootSchema={rootSchema}
        onAdd={(c) => {
          const v = selectedControl.fields.form.value ?? tree.rootNode;
          const newNode = tree.addNode(v, defaultControlForField(c.field));
          selectedControlId.value = newNode.id;
        }}
        selectedControl={selectedControl}
        selected={selectedField}
        className="grow overflow-y-auto overflow-x-hidden"
      />
    </div>
  );
}
