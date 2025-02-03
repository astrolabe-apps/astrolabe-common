import { getEditorFormTree, ViewContext } from "./index";
import { FormControlTree } from "../FormControlTree";
import React from "react";
import { TreeApi } from "react-arborist";
import { ControlNode } from "../types";
import { createFormTreeWithRoot } from "@react-typed-forms/schemas";
import { EditorFormNode } from "../EditorFormNode";
import { controlNotNull } from "@react-typed-forms/core";

export function FormStructureView({ context }: { context: ViewContext }) {
  const controlTreeApi = React.useRef<TreeApi<ControlNode> | null>(null);
  const { schemaLookup, currentForm, button } = context;
  const cf = controlNotNull(context.getCurrentForm());
  if (!cf) return <div>Select a form</div>;
  const schemaId = cf.fields.schemaId.value;
  const rootSchema = schemaId ? schemaLookup.getSchema(schemaId) : undefined;
  if (!rootSchema) return <div>Missing schema: {schemaId}</div>;
  const tree = getEditorFormTree(cf);
  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2">
        {button(() => controlTreeApi.current?.closeAll(), "Collapse")}
      </div>

      <FormControlTree
        rootNode={tree.rootNode}
        rootSchema={rootSchema}
        selected={cf.fields.selectedControl}
        selectedField={cf.fields.selectedField}
        onDeleted={() => {}}
        treeApi={controlTreeApi}
        className="grow overflow-y-auto overflow-x-hidden"
      />
    </div>
  );
}
