import React from "react";
import {
  useComputed,
  useControlEffect,
  Finput,
  Fcheckbox,
  Control,
} from "@react-typed-forms/core";
import {
  ControlDefinition,
  DataControlDefinition,
  DataRenderType,
  FormNode,
  GroupedControlsDefinition,
  isDataControl,
  isGroupControl,
  SchemaField,
} from "@react-typed-forms/schemas";
import { getBasicFieldType, getFieldTypeConfig } from "../fieldTypes";
import { renameFieldInForm } from "../fieldActions";
import { OptionsEditor } from "./OptionsEditor";
import { VisibilityConditionEditor } from "./VisibilityConditionEditor";
import { EditorFormTree } from "../EditorFormTree";
import { EditorSchemaTree } from "../EditorSchemaTree";

export interface PropertiesPanelProps {
  selectedField: Control<FormNode | undefined>;
  formTree: EditorFormTree;
  schemaTree: EditorSchemaTree;
  schemaFields: Control<SchemaField[]>;
  deleteField: () => void;
}

export function PropertiesPanel(props: PropertiesPanelProps) {
  const selectedField = useComputed(() => props.selectedField.value);

  if (!selectedField.value) {
    return (
      <div className="w-80 border-l border-violet-100 bg-white flex-shrink-0 p-4 text-slate-400 text-sm">
        Select a field to edit its properties
      </div>
    );
  }

  return <PropertiesPanelContent {...props} />;
}

function PropertiesPanelContent({
  selectedField,
  formTree,
  schemaTree,
  schemaFields,
  deleteField,
}: PropertiesPanelProps) {
  const formNode = selectedField.value;
  if (!formNode) return null;

  const defControl = formTree.getEditableDefinition(formNode);
  if (!defControl) return null;

  const def = defControl.value;
  const dataDefControl: Control<DataControlDefinition> = defControl.as();
  const groupDefControl: Control<GroupedControlsDefinition> = defControl.as();
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

  const allSchemaFields = schemaFields.value ?? [];

  useControlEffect(
    () => defControl.fields.title.value,
    (title) => {
      if (isData && title != null) {
        renameFieldInForm(schemaFields, dataDefControl.fields.field, title);
      }
    },
  );

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
          <Finput
            control={defControl.fields.title.as<string>()}
            className="w-full text-sm border border-violet-200 rounded-lg px-3 py-1.5 bg-violet-50/50 text-slate-800 focus:border-violet-500 focus:outline-none"
            placeholder="Field label"
          />
        </div>

        {showPlaceholder && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-[0.5px] mb-1.5">
              Placeholder
            </label>
            <Finput
              control={
                (dataDefControl.fields.renderOptions as Control<any>).fields
                  .placeholder
              }
              className="w-full text-sm border border-violet-200 rounded-lg px-3 py-1.5 bg-violet-50/50 text-slate-800 focus:border-violet-500 focus:outline-none"
              placeholder="Placeholder text"
            />
          </div>
        )}

        {isData && (
          <div className="flex items-center gap-2.5">
            <Fcheckbox
              control={dataDefControl.fields.required}
              id="required-toggle"
              className="rounded accent-violet-600"
            />
            <label htmlFor="required-toggle" className="text-sm text-slate-600">
              Required field
            </label>
          </div>
        )}

        {isGroup && (
          <div className="flex items-center gap-2.5">
            <Fcheckbox
              control={groupDefControl.fields.groupOptions.fields.hideTitle}
              id="hide-title-toggle"
              className="rounded accent-violet-600"
            />
            <label
              htmlFor="hide-title-toggle"
              className="text-sm text-slate-600"
            >
              Hide title
            </label>
          </div>
        )}

        {showOptions && schemaField && (
          <OptionsEditor options={schemaField.fields.options} />
        )}

        {(isData || isGroup) && (
          <VisibilityConditionEditor
            definition={defControl}
            allFields={allSchemaFields}
          />
        )}
      </div>
    </div>
  );
}

function findSchemaFieldControl(schemaTree: any, fieldName: string) {
  const formFields = schemaTree.getFormFields?.();
  if (formFields) {
    const found = formFields.elements.find(
      (el: any) => el.value.field === fieldName,
    );
    if (found) return found;
  }
  const rootFields = schemaTree.getRootFields();
  return rootFields.elements.find((el: any) => el.value.field === fieldName);
}
