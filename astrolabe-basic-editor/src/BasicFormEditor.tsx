import React, { useEffect } from "react";
import {
  newControl,
  useControl,
} from "@react-typed-forms/core";
import { SchemaField } from "@react-typed-forms/schemas";
import { BasicEditorState, BasicFormEditorProps } from "./types";
import { EditorFormTree } from "./EditorFormTree";
import { EditorSchemaTree } from "./EditorSchemaTree";
import {
  BasicEditorProvider,
  BasicEditorContextValue,
} from "./BasicEditorContext";
import { useFieldActions } from "./hooks/useFieldActions";
import { FieldPalette } from "./components/FieldPalette";
import { FormCanvas } from "./components/FormCanvas";
import { PropertiesPanel } from "./components/PropertiesPanel";
import clsx from "clsx";

export function BasicFormEditor<A>({
  formRenderer,
  loadForm,
  loadSchema,
  saveForm,
  formId,
  formTitle: formTitleProp,
  className,
  previewOptions,
}: BasicFormEditorProps<A>) {
  const state = useControl<BasicEditorState>({
    formTree: undefined!,
    schemaTree: undefined!,
    formFields: undefined!,
    schemaFields: undefined!,
    selectedFieldId: undefined,
    previewMode: false,
    loaded: false,
    formTitle: formTitleProp ?? "Untitled Form",
  });

  const saving = useControl(false);

  useEffect(() => {
    let cancelled = false;
    loadFormData();
    return () => {
      cancelled = true;
    };

    async function loadFormData() {
      const formData = await loadForm(formId);
      if (cancelled) return;

      const schemaData = await loadSchema(formData.schemaName);
      if (cancelled) return;

      const schemaFields = newControl<SchemaField[]>(schemaData.fields);
      const formFields = newControl<SchemaField[]>(formData.formFields ?? []);
      const formTree = new EditorFormTree(formData.controls);

      const schemaTree = new EditorSchemaTree(
        schemaFields,
        formData.schemaName,
        () => undefined,
        formFields,
      );

      state.value = {
        formTree,
        schemaTree,
        formFields,
        schemaFields,
        selectedFieldId: undefined,
        previewMode: false,
        loaded: true,
        formTitle: formTitleProp ?? "Untitled Form",
        config: formData.config,
      };
    }
  }, [formId]);

  const { addField, deleteField, selectField } = useFieldActions(state);

  async function handleSave() {
    const { formTree, formFields, config } = state.value;
    if (!formTree || !formFields) return;

    saving.value = true;
    try {
      const controls = formTree.getRootDefinitions().value;
      const fields = formFields.value;
      await saveForm(controls, formId, config, fields);
    } finally {
      saving.value = false;
    }
  }

  const ctxValue: BasicEditorContextValue = {
    state,
    formRenderer,
    addField,
    deleteField,
    selectField,
  };

  const loaded = state.fields.loaded.value;

  if (!loaded) {
    return (
      <div
        className={clsx(
          "flex items-center justify-center h-full text-gray-400",
          className,
        )}
      >
        Loading form...
      </div>
    );
  }

  return (
    <BasicEditorProvider value={ctxValue}>
      <div className={clsx("flex flex-col h-full", className)}>
        <div className="flex items-center justify-between px-4 py-2 border-b bg-white">
          <h2 className="text-lg font-semibold">
            {state.fields.formTitle.value}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                (state.fields.previewMode.value =
                  !state.fields.previewMode.value)
              }
              className={clsx(
                "px-3 py-1.5 text-sm rounded-md border transition-colors",
                state.fields.previewMode.value
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "hover:bg-gray-50",
              )}
            >
              {state.fields.previewMode.value ? "Edit" : "Preview"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving.value}
              className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving.value ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden">
          {!state.fields.previewMode.value && <FieldPalette />}
          <FormCanvas />
          {!state.fields.previewMode.value && <PropertiesPanel />}
        </div>
      </div>
    </BasicEditorProvider>
  );
}
