import { EditableForm, ViewContext } from "./index";
import React from "react";
import { FormSchemaTree } from "../FormSchemaTree";
import {
  Control,
  controlNotNull,
  useControlEffect,
} from "@react-typed-forms/core";
import { defaultControlForField } from "@react-typed-forms/schemas";
import { InactiveView } from "./InactiveView";

export function CurrentSchemaView({ context }: { context: ViewContext }) {
  const cf = controlNotNull(context.getCurrentForm());
  if (!cf) return <InactiveView>No form selected</InactiveView>;

  return <CurrentSchema form={cf} context={context} />;
}

function CurrentSchema({
  form,
  context,
}: {
  form: Control<EditableForm>;
  context: ViewContext;
}) {
  const {
    selectedControl,
    selectedControlId,
    selectedField,
    formTree: { value: tree },
    schema: { value: schemaTree },
  } = form.fields;

  useControlEffect(
    () => schemaTree.getRootFields().dirty,

    (unsaved) => {
      context.updateTabTitle(
        "currentSchema",
        "Current Schema" + (unsaved ? " *" : ""),
      );
    },
    true,
  );

  return (
    <div className="flex flex-col h-full">
      {context.saveSchema && (
        <div className="p-4">{context.button(doSave, "Save Schema")}</div>
      )}
      <FormSchemaTree
        rootSchema={schemaTree.rootNode}
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

  function doSave() {
    context.saveSchema?.(form);
  }
}
