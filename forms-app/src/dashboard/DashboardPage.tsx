import React, { ReactElement, useMemo } from "react";
import { useControl } from "@react-typed-forms/core";
import {
  DisplayRendererProps,
  FieldOption,
  getJsonPath,
} from "@react-typed-forms/schemas";
import { useToast } from "@astroapps/client";
import { useFormsApp } from "../FormsAppProvider";
import { makeActions } from "../types";
import { AppFormRenderer } from "../AppFormRenderer";
import { useDashboardSearch } from "./useDashboardSearch";
import { useExportDialog } from "./useExportDialog";
import { SelectionCheckbox } from "./SelectionCheckbox";
import { DashboardPageProps } from "./types";
import { defaultDashboardActionRenderers } from "./defaultActionRenderers";

export function DashboardPage({
  api,
  submittedStatus = "Submitted",
  formType = "AdminItemDashboard",
  onAction,
  customDisplay: customDisplayProp,
  customRenderers,
  initialRequest,
  showExport = true,
  exportFormType = "ExportDefinitionSelectionsForm",
}: DashboardPageProps) {
  const { ui } = useFormsApp();
  const { useConfirmDialog, Button } = ui;
  const toastService = useToast();

  const { dashboardForm, request, results, fieldOptions, loadDashboard } =
    useDashboardSearch({ api, initialRequest });

  const selectedItems = useControl<string[]>([]);

  const {
    exportDefinitions,
    selectedExportDefinitions,
    exporting,
    openDialog,
    Dialog,
    openExportDefinitionSelector,
    exportRecords,
    resetDialog,
  } = useExportDialog(api, ui.useDialog);

  const [openConfirm, confirmDialog] = useConfirmDialog();

  const allRenderers = useMemo(
    () => [...(customRenderers ?? []), ...defaultDashboardActionRenderers],
    [customRenderers],
  );

  return (
    <>
      <AppFormRenderer
        formType={formType}
        control={dashboardForm}
        dynamicFieldOptions={{ pathOptions: fieldOptions.value }}
        renderOptions={{
          customDisplay,
          actionOnClick: makeActions({
            view: (actionData) => {
              api.goToViewItem(actionData);
            },
            edit: (actionData) => {
              api.goToEditItem(actionData);
            },
            toggleAll: () => {
              selectedItems.setValue(
                (curSel) =>
                  results.fields.entries.elements
                    .filter((x) => x.fields.status.value == submittedStatus)
                    .map((x) => x.fields.id.value) ?? curSel,
              );
            },
            exportAll: async () => {
              await openExportDefinitionSelector(null, request.value);
            },
            exportSelected: async () => {
              await openExportDefinitionSelector([...selectedItems.value]);
            },
            export: async (actionData) => {
              await openExportDefinitionSelector([actionData], null);
            },
            delete: (actionData) => {
              openConfirm({
                title: "Delete Item",
                action: async () => {
                  await api.deleteItem(actionData);
                  toastService.addToast("Item deleted", { type: "success" });
                  await loadDashboard(request.value);
                },
                children: (
                  <p className="p-4">
                    Are you sure you want to delete this item?
                  </p>
                ),
              });
            },
            ...onAction,
          }),
        }}
        customRenderers={allRenderers}
      />
      {showExport && renderExportDialog()}
      {confirmDialog}
    </>
  );

  function renderExportDialog() {
    return (
      <Dialog
        actions={[
          <Button
            key={"export"}
            disabled={!selectedExportDefinitions.valid || exporting.value}
            onClick={exportRecords}
          >
            Export
          </Button>,
        ]}
        title={"Export Form(s)"}
        onCancel={resetDialog}
      >
        <AppFormRenderer
          control={selectedExportDefinitions}
          formType={exportFormType}
          dynamicDataOptions={(node) => {
            const paths = getJsonPath(node);
            const index = paths.at(1) as number;
            const tableElem = exportDefinitions.elements.at(index);
            return (
              tableElem?.fields?.infos?.value?.map(
                (x: { id: string; name: string }) =>
                  ({ value: x.id, name: x.name }) as FieldOption,
              ) ?? []
            );
          }}
        />
      </Dialog>
    );
  }
  function customDisplay(
    customId: string,
    ctx: DisplayRendererProps,
  ): ReactElement {
    if (customDisplayProp) {
      const result = customDisplayProp(customId, ctx);
      if (result) return result;
    }
    switch (customId) {
      case "check":
        return (
          <SelectionCheckbox
            control={ctx.dataContext.parentNode.control.as()}
            selected={selectedItems}
            submittedStatus={submittedStatus}
          />
        );
      default:
        return <></>;
    }
  }
}
