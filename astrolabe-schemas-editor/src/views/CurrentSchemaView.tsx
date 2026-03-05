import React, { Fragment } from "react";
import { FormSchemaTree, SchemaNodeCtx } from "../FormSchemaTree";
import {
  addElement,
  Control,
  controlNotNull,
  useControlEffect,
} from "@react-typed-forms/core";
import {
  defaultControlForField,
  SchemaField,
} from "@react-typed-forms/schemas";
import { InactiveView } from "./InactiveView";
import { EditableForm, FormEditContext, ViewContext } from "../types";
import { TreeApi } from "react-arborist";
import { defaultSchemaFieldForm } from "@react-typed-forms/schemas";

export function CurrentSchemaView({
  context,
}: {
  context: ViewContext & Pick<FormEditContext, "saveSchema" | "updateTabTitle">;
}) {
  const cf = controlNotNull(context.getCurrentForm());
  if (!cf) return <InactiveView>No form selected</InactiveView>;

  return <CurrentSchema form={cf} context={context} />;
}

function CurrentSchema({
  form,
  context,
}: {
  form: Control<EditableForm>;
  context: ViewContext &
    Pick<FormEditContext, "saveSchema" | "updateTabTitle">;
}) {
  const { button } = context;
  const {
    selectedControl,
    selectedControlId,
    selectedField,
    formTree: { value: tree },
  } = form.fields;

  const treeApi = React.useRef<TreeApi<SchemaNodeCtx> | null>(null);

  const schemaTree = context.getSchemaForForm(form);
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
      <div className="flex gap-2 p-4">
        {button(() => treeApi.current?.closeAll(), "Collapse", "collapse")}
        {button(
          () => addRootField(schemaTree.getFormFields()),
          "Add Form Field",
          "add",
        )}
        {context.saveSchema && (
          <>
            {button(
              () => addRootField(schemaTree.getRootFields()),
              "Add Schema Field",
              "addSchema",
            )}
            {context.button(doSave, "Save Schema")}
          </>
        )}
      </div>
      <FormSchemaTree
        rootSchema={schemaTree.rootNode}
        onAdd={(c) => {
          const v = selectedControl.fields.form.value ?? tree.rootNode;
          const newNode = tree.addNode(v, defaultControlForField(c.field));
          selectedControlId.value = newNode.id;
        }}
        treeApi={treeApi}
        selectedControl={selectedControl}
        selected={selectedField}
        className="grow overflow-y-auto overflow-x-hidden"
      />
    </div>
  );

  function addRootField(rootList: Control<SchemaField[]> | undefined) {
    if (rootList) {
      addElement(rootList, { ...defaultSchemaFieldForm });
    }
  }

  function doSave() {
    context.saveSchema?.(form);
  }
}
