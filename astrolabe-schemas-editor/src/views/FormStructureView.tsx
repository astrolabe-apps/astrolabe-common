import { FormControlTree } from "../FormControlTree";
import React from "react";
import { NodeApi, TreeApi } from "react-arborist";
import { ControlNode, ViewContext } from "../types";

import {
  addElement,
  Control,
  controlNotNull,
  groupedChanges,
  removeElement,
  updateElements,
} from "@react-typed-forms/core";
import { defaultControlDefinitionForm } from "@react-typed-forms/schemas";
import { InactiveView } from "./InactiveView";
import { ControlDefinition, groupedControl } from "@react-typed-forms/schemas";
import { paste } from "../controlActions";
import { writeClipboardData } from "../clipboard";

export function FormStructureView({ context }: { context: ViewContext }) {
  const controlTreeApi = React.useRef<TreeApi<ControlNode> | null>(null);
  const { button } = context;
  const cf = controlNotNull(context.getCurrentForm());
  if (!cf) return <InactiveView>No form selected</InactiveView>;
  const selectedTreeNode = cf.fields.selectedControlId;
  const rootSchema = context.getSchemaForForm(cf);
  const tree = cf.fields.formTree.value;
  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 p-4">
        {button(
          () => controlTreeApi.current?.closeAll(),
          "Collapse",
          "collapse",
        )}
        {button(addRootControl, "Add Control", "add")}
        {button(() => copyAction(true), "Cut", "cut")}
        {button(() => copyAction(false), "Copy", "copy")}
        {button(() => paste(tree), "Paste", "paste")}
      </div>

      <FormControlTree
        tree={tree}
        rootSchema={rootSchema.rootNode}
        selectedControl={cf.fields.selectedControl}
        selected={selectedTreeNode}
        selectedField={cf.fields.selectedField}
        onDeleted={onDelete}
        treeApi={controlTreeApi}
        className="grow overflow-y-auto overflow-x-hidden"
      />
    </div>
  );

  async function copyAction(cut: boolean) {
    const controlData = getSelectedControls(cut);
    if (controlData.length > 0) {
      await writeClipboardData({ controls: controlData });
    }
  }

  function getSelectedControls(
    cut: boolean,
    dontRemove?: Control<ControlDefinition>,
  ): ControlDefinition[] {
    const newChildren: ControlDefinition[] = [];
    const controlTree = controlTreeApi.current!;
    const selected = controlTree.selectedNodes;
    selected
      .map((x) => ({
        parent: x.data.form.parent,
        c: tree.getEditableDefinition(x.data.form),
      }))
      .forEach(({ parent, c }) => {
        if (c) {
          newChildren.push(c.value);
          if (cut && c != dontRemove) {
            const parentChildren = tree.getEditableChildren(parent);
            if (parentChildren) {
              removeElement(parentChildren, c);
            }
          }
        }
      });
    return newChildren;
  }

  function onDelete(node: NodeApi<ControlNode>) {
    if (node.id === selectedTreeNode.value) {
      selectedTreeNode.value = undefined;
    }
  }

  function addRootControl() {
    const newNode = tree.addNode(tree.rootNode, {
      ...defaultControlDefinitionForm,
      title: "New",
    });
    selectedTreeNode.value = newNode.id;
  }
}
