import React from "react";
import {
  RenderOptional,
  useControl,
  useControlEffect,
} from "@react-typed-forms/core";
import {
  createSchemaTree,
  FieldOption,
  RendererRegistration,
  SchemaField,
  SchemaNode,
} from "@react-typed-forms/schemas";
import { useToast } from "@astroapps/client";
import { useFormsApp } from "../service/formsApp";
import { AppFormRenderer } from "../AppFormRenderer";
import { ExportEditApi } from "../api";
import { ExportDefinitionEditData } from "../types";

export interface ExportEditPageProps {
  definitionId: string | undefined;
  api: ExportEditApi;
  tableSelectionFormType?: string;
  editFormType?: string;
  createFieldSelectionRenderer?: (options: {
    schema: SchemaNode;
  }) => RendererRegistration;
}

/**
 * Export definition edit/create page.
 * When definitionId is undefined, operates in create mode with table selection.
 * When definitionId is provided, loads the existing definition for editing.
 */
export function ExportEditPage({
  definitionId,
  api,
  tableSelectionFormType = "TableDefinitionSelectionForm",
  editFormType = "ExportDefinitionEditForm",
  createFieldSelectionRenderer,
}: ExportEditPageProps) {
  const { ui } = useFormsApp();
  const toast = useToast();

  const definitionEditForm = useControl<ExportDefinitionEditData>();
  const { tableDefinitionId, name, exportColumns } =
    definitionEditForm.fields;

  const tableDefinitionOptions = useControl<FieldOption[] | undefined>();
  const selectedTableDefinitionFields = useControl<SchemaField[]>();
  const renderers = useControl<RendererRegistration[]>([]);

  const tableDefinitionSelection = useControl<{
    tableDefinitionId: string;
  }>();

  // In create mode, sync table selection to the edit form
  useControlEffect(
    () => tableDefinitionSelection.value,
    (v) => {
      if (!definitionId) {
        tableDefinitionId.value = v?.tableDefinitionId;
      }
    },
  );

  // Load based on mode
  useControlEffect(
    () => definitionId,
    (id) => {
      if (id != null && id !== "") {
        loadExportDefinition(id);
      } else if (id === "") {
        api.goToExportDashboard();
      } else {
        loadTableDefinitionList();
      }
    },
    true,
  );

  // In create mode, load table fields when selection changes
  useControlEffect(
    () => tableDefinitionId.value,
    (v) => {
      if (!definitionId) loadTableDefinitionFields(v);
    },
    true,
  );

  // Build renderers when fields change
  useControlEffect(
    () => selectedTableDefinitionFields.value,
    (fd) => {
      if (!fd || !createFieldSelectionRenderer) return;
      const schemaNode = createSchemaTree(fd).rootNode;
      renderers.value = [createFieldSelectionRenderer({ schema: schemaNode })];
    },
  );

  return (
    <div className="py-6">
      <RenderOptional
        control={tableDefinitionOptions}
        notDefined={<ui.CircularProgress />}
      >
        {(c) => (
          <AppFormRenderer
            formType={tableSelectionFormType}
            control={tableDefinitionSelection}
            dynamicFieldOptions={{
              pathOptions: { "/tableDefinitionId": c },
            }}
            renderOptions={definitionId ? { readonly: true } : undefined}
          />
        )}
      </RenderOptional>

      <RenderOptional control={selectedTableDefinitionFields}>
        {() => (
          <div className="flex flex-col gap-4">
            <ui.Button
              onClick={saveExportDefinition}
              disabled={
                definitionId
                  ? !definitionEditForm.dirty || !definitionEditForm.valid
                  : !definitionEditForm.valid
              }
            >
              Save
            </ui.Button>

            <AppFormRenderer
              formType={editFormType}
              control={definitionEditForm}
              customRenderers={renderers.value}
              renderOptions={{ actionOnClick: formActions }}
            />
          </div>
        )}
      </RenderOptional>
    </div>
  );

  async function loadTableDefinitionList() {
    const results = await api.listTables();
    tableDefinitionOptions.setInitialValue(
      results.map(
        (t) => ({ name: t.name, value: t.id }) as FieldOption,
      ),
    );
  }

  async function loadTableDefinitionFields(id?: string) {
    if (!id) {
      selectedTableDefinitionFields.setInitialValue(undefined);
    } else {
      const tableDefinition = await api.getTable(id);
      selectedTableDefinitionFields.setInitialValue(
        tableDefinition.fields as SchemaField[],
      );
    }
    name.value = "";
    exportColumns.value = [];
    definitionEditForm.validate();
  }

  async function loadExportDefinition(id: string) {
    try {
      const exportDefinition = await api.getExportDefinition(id);
      definitionEditForm.setInitialValue(exportDefinition);

      const tableDefinition = await api.getTable(
        exportDefinition.tableDefinitionId,
      );

      tableDefinitionOptions.setInitialValue([
        {
          name: tableDefinition.name,
          value: exportDefinition.tableDefinitionId,
        } as FieldOption,
      ]);

      tableDefinitionSelection.setInitialValue({
        tableDefinitionId: exportDefinition.tableDefinitionId,
      });

      selectedTableDefinitionFields.setInitialValue(
        tableDefinition.fields as SchemaField[],
      );
    } catch (e) {
      console.error(e);
    }
  }

  async function saveExportDefinition() {
    try {
      await api.saveExportDefinition(definitionEditForm.value!);

      if (definitionId) {
        toast.addToast(
          `Update export definition: "${name.value}" successfully`,
          { type: "success" },
        );
        definitionEditForm.markAsClean();
      } else {
        toast.addToast(
          `Add export definition: "${name.value}" successfully`,
          { type: "success" },
        );
        api.goToExportDashboard();
      }
    } catch (e) {
      console.error(e);
    }
  }

  function formActions(actionId: string, actionData: any) {
    return async () => {
      switch (actionId) {
        case "saveExportDefinition":
          await saveExportDefinition();
          return;
        default:
          return;
      }
    };
  }
}
