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
  const selectedId = useComputed(
    () => state.fields.selectedFieldId.value,
  );

  if (!selectedId.value) {
    return (
      <div className="w-80 border-l bg-white flex-shrink-0 p-4 text-gray-400 text-sm">
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
  const selectedId = state.fields.selectedFieldId.value;
  if (!formTree || !schemaTree || !selectedId) return null;

  const formNode = formTree.rootNode.visit((x) =>
    x.id === selectedId ? x : undefined,
  );
  if (!formNode) return null;

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
    <div className="w-80 border-l bg-white flex-shrink-0 overflow-y-auto">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {fieldConfig && (
              <span className="text-gray-500 font-mono text-lg">
                {fieldConfig.icon}
              </span>
            )}
            <span className="font-medium text-sm">
              {fieldConfig?.label ?? def.type}
            </span>
          </div>
          <button
            onClick={() => deleteField(selectedId)}
            className="text-gray-400 hover:text-red-500 text-sm"
            title="Delete field"
          >
            Delete
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Label
          </label>
          <input
            className="w-full text-sm border rounded px-2 py-1.5"
            value={def.title ?? ""}
            onChange={(e) =>
              defControl.setValue((d) => ({ ...d, title: e.target.value }))
            }
            placeholder="Field label"
          />
        </div>

        {showPlaceholder && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Placeholder
            </label>
            <input
              className="w-full text-sm border rounded px-2 py-1.5"
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
          <div className="flex items-center gap-2">
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
              className="rounded"
            />
            <label htmlFor="required-toggle" className="text-sm">
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
