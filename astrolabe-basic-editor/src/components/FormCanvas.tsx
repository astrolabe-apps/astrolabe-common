import React, { useMemo } from "react";
import { Control, useControl } from "@react-typed-forms/core";
import {
  createSchemaDataNode,
  defaultSchemaInterface,
  RenderForm,
} from "@react-typed-forms/schemas";
import {
  createPreviewNode,
  FormControlPreview,
  FormControlPreviewContext,
} from "../FormControlPreview";
import { useBasicEditorContext } from "../BasicEditorContext";

export function FormCanvas() {
  const { state } = useBasicEditorContext();
  const previewMode = state.fields.previewMode.value;
  if (previewMode) {
    return <PreviewModeCanvas />;
  }
  return <EditModeCanvas />;
}

function EditModeCanvas() {
  const { state, formRenderer, selectField } = useBasicEditorContext();
  const formTree = state.fields.formTree.value;
  const schemaTree = state.fields.schemaTree.value;
  const selectedControl = state.fields.selectedFieldId as unknown as Control<string | undefined>;

  const previewContext: FormControlPreviewContext = useMemo(
    () => ({
      selected: selectedControl,
      renderer: formRenderer,
    }),
    [formRenderer, selectedControl],
  );

  const rootNode = formTree?.rootNode;
  const schemaRootNode = schemaTree?.rootNode;
  if (!rootNode || !schemaRootNode) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }

  const dataControl = useControl({});
  const dataNode = useMemo(
    () => createSchemaDataNode(schemaRootNode, dataControl),
    [schemaRootNode],
  );

  const previewNode = useMemo(
    () =>
      createPreviewNode(
        "root",
        defaultSchemaInterface,
        rootNode,
        dataNode,
        formRenderer,
      ),
    [rootNode, dataNode, formRenderer],
  );

  return (
    <div
      className="flex-1 overflow-auto p-6 bg-slate-50"
      onClick={() => selectField(undefined)}
    >
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-[0_4px_20px_rgba(44,43,61,0.04),0_1px_4px_rgba(44,43,61,0.02)] border border-violet-100/60 p-6 min-h-[200px]">
        <FormControlPreview
          node={previewNode}
          context={previewContext}
        />
      </div>
    </div>
  );
}

function PreviewModeCanvas() {
  const { state, formRenderer } = useBasicEditorContext();
  const formTree = state.fields.formTree.value;
  const schemaTree = state.fields.schemaTree.value;
  const previewData = useControl({});

  const rootNode = formTree?.rootNode;
  const schemaRootNode = schemaTree?.rootNode;
  if (!rootNode || !schemaRootNode) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }

  const dataNode = useMemo(
    () => createSchemaDataNode(schemaRootNode, previewData),
    [schemaRootNode],
  );

  return (
    <div className="flex-1 overflow-auto p-6 bg-slate-50">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-[0_4px_20px_rgba(44,43,61,0.04),0_1px_4px_rgba(44,43,61,0.02)] border border-violet-100/60 p-6 min-h-[200px]">
        <RenderForm
          data={dataNode}
          form={rootNode}
          renderer={formRenderer}
        />
      </div>
    </div>
  );
}
