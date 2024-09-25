import { Control, newControl, useComputed } from "@react-typed-forms/core";
import { ControlDefinitionForm, SchemaFieldForm } from "./schemaSchemas";
import React, { ReactElement } from "react";
import {
  FormRenderer,
  GroupedControlsDefinition,
  makeSchemaDataNode,
  rootSchemaNode,
  SchemaField,
  useControlRendererComponent,
} from "@react-typed-forms/schemas";
import {
  findAllParentsInControls,
  findSchemaFieldListForParents,
  useEditorDataHook,
} from "./util";

export function FormControlEditor({
  control,
  renderer,
  editorFields,
  fields,
  editorControls,
  rootControls,
}: {
  control: Control<ControlDefinitionForm>;
  editorControls: GroupedControlsDefinition;
  editorFields: SchemaField[];
  fields: Control<SchemaFieldForm[]>;
  renderer: FormRenderer;
  rootControls: Control<ControlDefinitionForm[]>;
}): ReactElement {
  const fieldList = useComputed(() => {
    const parentFields = findAllParentsInControls(control, rootControls);
    return (
      findSchemaFieldListForParents(fields, parentFields) ??
      newControl<SchemaFieldForm[]>([])
    );
  }).value;
  const useDataHook = useEditorDataHook(rootSchemaNode(fieldList.value));
  const editorNode = makeSchemaDataNode(rootSchemaNode(editorFields), control);
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
