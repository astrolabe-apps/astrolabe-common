import React from "react";
import { useComputed } from "@react-typed-forms/core";
import {
  ControlDefinition,
  DataControlDefinition,
  DataRenderType,
  isDataControl,
  isGroupControl,
  SchemaField,
} from "@react-typed-forms/schemas";
import { useBasicEditorContext } from "../BasicEditorContext";
import { getBasicFieldType, getFieldTypeConfig } from "../fieldTypes";
import { OptionsEditor } from "./OptionsEditor";
import { VisibilityConditionEditor } from "./VisibilityConditionEditor";

export function PropertiesPanel() {
  const { state, deleteField } = useBasicEditorContext();
  const selectedField = useComputed(
    () => state.fields.selectedField.value,
  );

  if (!selectedField.value) {
    return (
      <div className="w-80 border-l border-violet-100 bg-white flex-shrink-0 p-4 text-slate-400 text-sm">
        Select a field to edit its properties
      </div>
    );
  }

  return <PropertiesPanelContent />;
}

function PropertiesPanelContent() {
  const { state, deleteField } = useBasicEditorContext();

  const formTree = state.fields.formTree.value;
  const schemaTree = state.fields.schemaTree.value;
  const formNode = state.fields.selectedField.value;
  if (!formTree || !schemaTree || !formNode) return null;

  const defControl = formTree.getEditableDefinition(formNode);
  if (!defControl) return null;

  const def = defControl.value;
  const fieldType = getBasicFieldType(def);
  const fieldConfig = fieldType ? getFieldTypeConfig(fieldType) : undefined;
  const isData = isDataControl(def);
  const isGroup = isGroupControl(def);

  const dataDef = isData ? (def as DataControlDefinition) : undefined;
  const renderType = dataDef?.renderOptions?.type;
  const showPlaceholder =
    renderType === DataRenderType.Textfield ||
    renderType === DataRenderType.Dropdown;
  const showOptions =
    renderType === DataRenderType.Radio ||
    renderType === DataRenderType.Dropdown;

  const schemaField = dataDef
    ? findSchemaFieldControl(schemaTree, dataDef.field)
    : undefined;

  const allSchemaFields = [
    ...(state.fields.schemaFields.value?.value ?? []),
    ...(state.fields.formFields.value?.value ?? []),
  ];

  return (
    <div className="w-80 border-l border-violet-100 bg-white flex-shrink-0 overflow-y-auto">
      <div className="px-4 py-3 border-b border-violet-100 bg-violet-50/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {fieldConfig && (
              <span className="text-violet-500 font-mono text-lg">
                {fieldConfig.icon}
              </span>
            )}
            <span className="font-semibold text-sm text-slate-800">
              {fieldConfig?.label ?? def.type}
            </span>
          </div>
          <button
            onClick={() => deleteField()}
            className="text-slate-400 hover:text-red-500 text-sm transition-colors"
            title="Delete field"
          >
            Delete
          </button>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-[0.5px] mb-1.5">
            Label
          </label>
          <input
            className="w-full text-sm border border-violet-200 rounded-lg px-3 py-1.5 bg-violet-50/50 text-slate-800 focus:border-violet-500 focus:outline-none"
            value={def.title ?? ""}
            onChange={(e) =>
              defControl.setValue((d) => ({ ...d, title: e.target.value }))
            }
            placeholder="Field label"
          />
        </div>

        {showPlaceholder && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-[0.5px] mb-1.5">
              Placeholder
            </label>
            <input
              className="w-full text-sm border border-violet-200 rounded-lg px-3 py-1.5 bg-violet-50/50 text-slate-800 focus:border-violet-500 focus:outline-none"
              value={
                (dataDef?.renderOptions as any)?.placeholder ?? ""
              }
              onChange={(e) => {
                defControl.setValue((d) => ({
                  ...d,
                  renderOptions: {
                    ...((d as DataControlDefinition).renderOptions ?? {
                      type: DataRenderType.Textfield,
                    }),
                    placeholder: e.target.value || null,
                  },
                }));
              }}
              placeholder="Placeholder text"
            />
          </div>
        )}

        {isData && (
          <div className="flex items-center gap-2.5">
            <input
              type="checkbox"
              id="required-toggle"
              checked={!!dataDef?.required}
              onChange={(e) =>
                defControl.setValue((d) => ({
                  ...d,
                  required: e.target.checked || null,
                }))
              }
              className="rounded accent-violet-600"
            />
            <label htmlFor="required-toggle" className="text-sm text-slate-600">
              Required field
            </label>
          </div>
        )}

        {showOptions && schemaField && (
          <OptionsEditor options={schemaField.fields.options} />
        )}

        {isData && (
          <VisibilityConditionEditor
            definition={defControl}
            allFields={allSchemaFields}
          />
        )}
      </div>
    </div>
  );
}

function findSchemaFieldControl(
  schemaTree: any,
  fieldName: string,
) {
  const formFields = schemaTree.getFormFields?.();
  if (formFields) {
    const found = formFields.elements.find(
      (el: any) => el.value.field === fieldName,
    );
    if (found) return found;
  }
  const rootFields = schemaTree.getRootFields();
  return rootFields.elements.find(
    (el: any) => el.value.field === fieldName,
  );
}
