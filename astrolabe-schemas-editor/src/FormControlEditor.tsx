import { Control } from "@react-typed-forms/core";
import { ControlDefinitionForm, SchemaFieldForm } from "./schemaSchemas";
import React, { ReactElement } from "react";
import {
  FormRenderer,
  GroupedControlsDefinition,
  makeSchemaDataNode,
  SchemaNode,
  useControlRendererComponent,
} from "@react-typed-forms/schemas";
import { useEditorDataHook } from "./util";
import { ControlNode } from "./types";

export function FormControlEditor({
  controlNode,
  renderer,
  editorFields,
  editorControls,
}: {
  controlNode: ControlNode;
  editorControls: GroupedControlsDefinition;
  editorFields: SchemaNode;
  renderer: FormRenderer;
}): ReactElement {
  const useDataHook = useEditorDataHook(controlNode.schema);
  const editorNode = makeSchemaDataNode(editorFields, controlNode.control);
  const RenderEditor = useControlRendererComponent(
    editorControls,
    renderer,
    {
      useDataHook,
    },
    editorNode,
  );
  return <RenderEditor />;
}
