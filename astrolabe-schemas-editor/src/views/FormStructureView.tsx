import { ViewContext } from "./index";
import { FormControlTree } from "../FormControlTree";
import React from "react";
import { NodeApi, TreeApi } from "react-arborist";
import { ControlNode } from "../types";
import { controlNotNull } from "@react-typed-forms/core";
import { defaultControlDefinitionForm } from "../schemaSchemas";
import { InactiveView } from "./InactiveView";

export function FormStructureView({ context }: { context: ViewContext }) {
  const controlTreeApi = React.useRef<TreeApi<ControlNode> | null>(null);
  const { currentForm, button } = context;
  const cf = controlNotNull(context.getCurrentForm());
  if (!cf) return <InactiveView>No form selected</InactiveView>;
  const selectedTreeNode = cf.fields.selectedControlId;
  const rootSchema = cf.fields.schema.value;
  const tree = cf.fields.formTree.value;
  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 p-4">
        {button(() => controlTreeApi.current?.closeAll(), "Collapse")}
        {button(addRootControl, "Add Control")}
      </div>

      <FormControlTree
        rootNode={tree.rootNode}
        rootSchema={rootSchema}
        selectedControl={cf.fields.selectedControl}
        selected={selectedTreeNode}
        selectedField={cf.fields.selectedField}
        onDeleted={onDelete}
        treeApi={controlTreeApi}
        className="grow overflow-y-auto overflow-x-hidden"
      />
    </div>
  );

  function onDelete(node: NodeApi<ControlNode>) {
    if (node.id === selectedTreeNode.value) {
      selectedTreeNode.value = undefined;
    }
  }

  function addRootControl() {
    const newControl = tree.addChild(tree.rootNode, {
      ...defaultControlDefinitionForm,
      title: "New",
    });
    selectedTreeNode.value = newControl.id;
  }
}
