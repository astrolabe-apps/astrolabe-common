import { ViewContext } from "./index";
import { FormControlTree } from "../FormControlTree";
import React from "react";
import { TreeApi } from "react-arborist";
import { ControlNode } from "../types";

export function FormStructureView({ context }: { context: ViewContext }) {
  const controlTreeApi = React.useRef<TreeApi<ControlNode> | null>(null);
  const { selectedField, schemaLookup, currentForm, selectedControl, button } =
    context;
  const formId = currentForm.value;
  const formTree = formId ? context.getForm(formId) : undefined;
  console.log(formTree);
  const schemaId = formTree?.fields.schemaId.value;
  const rootSchema = schemaId ? schemaLookup.getSchema(schemaId) : undefined;
  const rootControls = formTree?.fields.rootNode.value;
  if (!rootControls) return <div>Select a form</div>;
  if (!rootSchema) return <div>Missing schema: {schemaId}</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2">
        {button(() => controlTreeApi.current?.closeAll(), "Collapse")}
      </div>

      <FormControlTree
        rootNode={rootControls}
        rootSchema={rootSchema}
        selected={selectedControl}
        selectedField={selectedField}
        onDeleted={() => {}}
        treeApi={controlTreeApi}
        className="grow"
      />
    </div>
  );
}
