import React, { useState, useEffect } from "react";
import {
  newControl,
  useControl,
  useComputed,
  Control,
} from "@react-typed-forms/core";
import {
  ControlDefinition,
  FormNode,
  FormRenderer,
  SchemaField,
  createFormTree,
  createSchemaTree,
  createSchemaDataNode,
  RenderForm,
  FormTree,
  SchemaDataNode,
} from "@react-typed-forms/schemas";
import { useFormsApp } from "../FormsAppProvider";
import {
  FormConfigData,
  FormDefinitionEditData,
  FormLayoutMode,
  PageNavigationStyle,
  TableDefinitionEditData,
} from "../types";
import { FormsEditorApi } from "../api";
import { FormsEditorComponents } from "./types";
import { BasicFieldType, EditorFormTree, EditorSchemaTree } from "@astroapps/basic-editor";
import { FormConfigSettings } from "./FormConfigSettings";
import { DraggableDebugWindow } from "./DraggableDebugWindow";
import { wrapFormControls } from "../item/workflowActions";

interface SelectedForm {
  id: string;
  name: string;
  tableId: string;
}

interface FormEditState {
  controls: ControlDefinition[];
  schemaFields: SchemaField[];
  config: FormConfigData;
}

interface EditorData {
  formTree: EditorFormTree;
  schemaTree: EditorSchemaTree;
  editState: Control<FormEditState>;
}

interface PreviewSnapshot {
  formTree: FormTree;
  dataNode: SchemaDataNode;
}

export interface FormsEditorPageProps {
  api: FormsEditorApi;
  editorComponents: FormsEditorComponents;
  createPreviewRenderer: () => FormRenderer;
  /** Schema map for config schema (e.g. SchemaMap.FormConfig) */
  configSchema?: SchemaField[];
}

/**
 * Visual form editor page.
 * All editor components are injected via editorComponents prop.
 */
export function FormsEditorPage({
  api,
  editorComponents,
  createPreviewRenderer,
}: FormsEditorPageProps) {
  const { ui } = useFormsApp();
  const {
    createEditorFormTree,
    createEditorSchemaTree,
    FieldPalette,
    FormCanvas,
    PropertiesPanel,
    addFieldToForm,
    deleteFieldFromForm,
    moveFieldInForm,
    Popover,
  } = editorComponents;

  const [forms, setForms] = useState<{ id: string; name: string }[]>([]);
  const [selectedForm, setSelectedForm] = useState<SelectedForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editorData, setEditorData] = useState<EditorData | null>(null);
  const [preview, setPreview] = useState(false);
  const [previewSnapshot, setPreviewSnapshot] =
    useState<PreviewSnapshot | null>(null);
  const previewData = useControl<Record<string, any>>({});
  const newFormName = useControl("");
  const selectedField = useControl<FormNode | undefined>(undefined);
  const [showDebug, setShowDebug] = useState(false);
  const [openConfirm, confirmDialog] = ui.useConfirmDialog();

  const pageMode =
    editorData?.editState.fields.config.fields.layoutMode.value ===
    FormLayoutMode.MultiPage;
  const isDirty = useComputed(() => editorData?.editState.dirty ?? false);

  async function loadForms() {
    setLoading(true);
    try {
      const list = await api.listForms(undefined, undefined);
      setForms(list);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadForms();
  }, []);

  // Load editor data when a form is selected
  useEffect(() => {
    if (!selectedForm) {
      setEditorData(null);
      return;
    }
    let cancelled = false;
    loadEditorData();
    return () => {
      cancelled = true;
    };

    async function loadEditorData() {
      const form = await api.getForm(selectedForm!.id);
      if (cancelled) return;
      const table = await api.getTable(form.tableId!);
      if (cancelled) return;

      const editState = newControl<FormEditState>({
        controls: form.controls as ControlDefinition[],
        schemaFields: table.fields as SchemaField[],
        config: form.config,
      });
      const formTree = createEditorFormTree(editState.fields.controls);
      const schemaTree = createEditorSchemaTree(
        editState.fields.schemaFields,
        form.tableId!,
        () => undefined,
      );

      selectedField.value = undefined;
      setEditorData({ formTree, schemaTree, editState });
    }
  }, [selectedForm?.id]);

  async function handleCreateForm() {
    openConfirm({
      title: "Create New Form",
      action: async () => {
        const name = newFormName.value.trim();
        if (!name) return;
        const shortId = name.toLowerCase().replace(/\s+/g, "-");
        const newTableId = await api.createTable({
          shortId,
          fields: [],
          name: name + " Table",
          groupId: "",
          nameField: "",
          tags: [],
        });
        await api.createForm({
          tableId: newTableId,
          groupId: "",
          controls: [],
          name,
          shortId,
          config: {
            layoutMode: FormLayoutMode.SinglePage,
            navigationStyle: PageNavigationStyle.Wizard,
          },
        });
        newFormName.value = "";
        await loadForms();
      },
      children: (
        <div className="p-4">
          <ui.Textfield
            control={newFormName}
            label="Form Name"
            inputClass="border"
          />
        </div>
      ),
    });
  }

  async function handleDeleteForm(form: { id: string; name: string }) {
    openConfirm({
      title: "Delete Form",
      action: async () => {
        const formDef = await api.getForm(form.id);
        await api.deleteForm(form.id);
        if (formDef.tableId) {
          await api.deleteTable(formDef.tableId);
        }
        if (selectedForm?.id === form.id) {
          setSelectedForm(null);
        }
        await loadForms();
      },
      children: (
        <p className="p-4">
          Are you sure you want to delete &quot;{form.name}&quot;? This will
          also delete the associated table definition.
        </p>
      ),
    });
  }

  async function handleSelectForm(form: { id: string; name: string }) {
    if (editorData?.editState.dirty) {
      openConfirm({
        title: "Unsaved Changes",
        action: () => doSelectForm(form),
        children: (
          <p className="p-4">
            You have unsaved changes. Are you sure you want to switch forms?
            Your changes will be lost.
          </p>
        ),
      });
    } else {
      doSelectForm(form);
    }
  }

  function doSelectForm(form: { id: string; name: string }) {
    setSelectedForm({
      id: form.id,
      name: form.name,
      tableId: "",
    });
  }

  async function handleSave() {
    if (!editorData || !selectedForm) return;
    setSaving(true);
    try {
      const {
        controls,
        schemaFields: fields,
        config,
      } = editorData.editState.value;
      const form = await api.getForm(selectedForm.id);
      await api.editForm(selectedForm.id, {
        ...form,
        controls,
        config,
      });
      if (form.tableId) {
        const table = await api.getTable(form.tableId);
        await api.editTable(form.tableId, {
          ...table,
          fields,
        });
      }
      editorData.editState.markAsClean();
    } finally {
      setSaving(false);
    }
  }

  function handleAddField(type: BasicFieldType) {
    if (!editorData) return;
    addFieldToForm(
      editorData.formTree,
      editorData.editState.fields.schemaFields,
      selectedField,
      type,
      pageMode,
    );
  }

  function handleDeleteField() {
    if (!editorData) return;
    deleteFieldFromForm(
      editorData.formTree,
      editorData.editState.fields.schemaFields,
      selectedField,
    );
  }

  function handleMoveField(
    sourceNode: FormNode,
    targetContainer: FormNode,
    insertBefore: FormNode | null,
  ) {
    if (!editorData) return;
    moveFieldInForm(
      editorData.formTree,
      sourceNode,
      targetContainer,
      insertBefore,
      pageMode,
    );
  }

  function handleSelectField(node: FormNode | undefined) {
    selectedField.value = node;
  }

  function handleTogglePreview() {
    if (preview) {
      setPreview(false);
      setPreviewSnapshot(null);
      return;
    }
    if (!editorData) return;

    const { controls, schemaFields, config } = editorData.editState.value;
    const formControls = wrapFormControls(controls, config);
    const formTree = createFormTree(formControls);
    const schemaTree = createSchemaTree(schemaFields);
    previewData.value = {};
    const dataNode = createSchemaDataNode(schemaTree.rootNode, previewData);

    setPreviewSnapshot({ formTree, dataNode });
    setPreview(true);
  }

  const formRenderer = createPreviewRenderer();

  return (
    <div className="flex h-screen">
      {confirmDialog}
      {showDebug && editorData && (
        <DraggableDebugWindow
          formTree={editorData.formTree}
          schemaFields={editorData.editState.fields.schemaFields}
          onClose={() => setShowDebug(false)}
        />
      )}
      {/* Sidebar */}
      <div className="w-64 border-r bg-gray-50 flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold mb-3">Forms</h2>
          <ui.Button onClick={handleCreateForm}>New Form</ui.Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="p-4 text-gray-500">Loading...</p>
          ) : forms.length === 0 ? (
            <p className="p-4 text-gray-500">No forms yet</p>
          ) : (
            <ul>
              {forms.map((form) => (
                <li
                  key={form.id}
                  className={`flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                    selectedForm?.id === form.id ? "bg-violet-100" : ""
                  }`}
                >
                  <span
                    className="flex-1 truncate"
                    onClick={() => handleSelectForm(form)}
                  >
                    {form.name}
                  </span>
                  <button
                    className="ml-2 text-red-500 hover:text-red-700 text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteForm(form);
                    }}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedForm ? (
          <>
            <div className="px-4 py-2 border-b flex items-center justify-between bg-white">
              <h1 className="text-lg font-semibold">{selectedForm.name}</h1>
              <div className="flex items-center gap-3">
                {editorData && (
                  <Popover
                    content={
                      <FormConfigSettings
                        configControl={editorData.editState.fields.config}
                        editorComponents={editorComponents}
                      />
                    }
                    className="w-72"
                    asChild
                  >
                    <button className="px-4 py-1.5 text-sm rounded-md font-semibold text-gray-700 border border-gray-300 shadow-sm hover:bg-gray-50 transition-all">
                      Settings
                    </button>
                  </Popover>
                )}
                <button
                  onClick={() => setShowDebug((v) => !v)}
                  disabled={!editorData}
                  className={`px-4 py-1.5 text-sm rounded-md font-semibold border shadow-sm transition-all disabled:opacity-50 ${
                    showDebug
                      ? "bg-gray-800 text-white border-gray-800"
                      : "text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  Debug
                </button>
                <button
                  onClick={handleTogglePreview}
                  disabled={!editorData}
                  className="px-4 py-1.5 text-sm rounded-md font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                >
                  {preview ? "Edit" : "Preview"}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-1.5 text-sm rounded-md font-semibold text-white bg-gradient-to-r from-violet-600 to-violet-500 shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                >
                  {saving ? "Saving..." : isDirty.value ? "Save *" : "Save"}
                </button>
              </div>
            </div>
            {preview && previewSnapshot ? (
              <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-3xl mx-auto">
                  <RenderForm
                    form={previewSnapshot.formTree.rootNode}
                    data={previewSnapshot.dataNode}
                    renderer={formRenderer}
                  />
                </div>
              </div>
            ) : editorData ? (
              <div className="flex flex-1 overflow-hidden">
                <FieldPalette
                  addField={handleAddField}
                  pageMode={pageMode}
                  selectedField={selectedField.value}
                  rootNode={editorData.formTree.rootNode}
                />
                <FormCanvas
                  formTree={editorData.formTree}
                  schemaTree={editorData.schemaTree}
                  selectedField={selectedField}
                  formRenderer={formRenderer}
                  selectField={handleSelectField}
                  moveField={handleMoveField}
                  pageMode={pageMode}
                />
                <PropertiesPanel
                  selectedField={selectedField}
                  formTree={editorData.formTree}
                  schemaTree={editorData.schemaTree}
                  schemaFields={editorData.editState.fields.schemaFields}
                  deleteField={handleDeleteField}
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                Loading form...
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <p>Select a form from the sidebar or create a new one</p>
          </div>
        )}
      </div>
    </div>
  );
}
