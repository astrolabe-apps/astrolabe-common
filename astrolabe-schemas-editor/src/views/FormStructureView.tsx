import { getEditorFormTree, ViewContext } from "./index";
import { FormControlTree } from "../FormControlTree";
import React, { useEffect } from "react";
import { TreeApi } from "react-arborist";
import { ControlNode } from "../types";
import { createFormTreeWithRoot } from "@react-typed-forms/schemas";
import { EditorFormNode } from "../EditorFormNode";
import { controlNotNull, useControl } from "@react-typed-forms/core";
import { defaultControlDefinitionForm } from "../schemaSchemas";

export function FormStructureView({ context }: { context: ViewContext }) {
  const controlTreeApi = React.useRef<TreeApi<ControlNode> | null>(null);
  const { schemaLookup, currentForm, button } = context;
  const cf = controlNotNull(context.getCurrentForm());
  const selectedTreeNode = useControl(
    () => cf?.fields.selectedControl.value?.form.id,
  );
  if (!cf) return <div>Select a form</div>;
  const schemaId = cf.fields.schemaId.value;
  const rootSchema = schemaId ? schemaLookup.getSchema(schemaId) : undefined;
  if (!rootSchema) return <div>Missing schema: {schemaId}</div>;
  const tree = getEditorFormTree(cf);
  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2">
        {button(() => controlTreeApi.current?.closeAll(), "Collapse")}
        {button(addRootControl, "Add Control")}
      </div>

      <FormControlTree
        rootNode={tree.rootNode}
        rootSchema={rootSchema}
        selectedControl={cf.fields.selectedControl}
        selected={selectedTreeNode}
        selectedField={cf.fields.selectedField}
        onDeleted={() => {}}
        treeApi={controlTreeApi}
        className="grow overflow-y-auto overflow-x-hidden"
      />
    </div>
  );

  function addRootControl() {
    const newControl = (tree.rootNode as EditorFormNode).addChild({
      ...defaultControlDefinitionForm,
      title: "New",
    });
    const newId = newControl.uniqueId.toString();
    selectedTreeNode.value = newId;
  }
}
