import React, { useEffect } from "react";
import { useControl } from "@react-typed-forms/core";
import { ControlDataContext } from "@react-typed-forms/schemas";
import { defaultSearchOptions } from "@astroapps/searchstate";
import { useToast } from "@astroapps/client";
import { useFormsApp } from "../FormsAppProvider";
import { AppFormRenderer } from "../AppFormRenderer";
import { ExportDashboardApi } from "../api";
import { ExportDefinitionGroupData } from "../types";
import { DashboardActionHandlers } from "../dashboard/types";

/**
 * Flattened export definition info for the dashboard form.
 */
interface ExportDefinitionDashboardInfo {
  id: string;
  name: string;
  tableDefinitionName: string;
  tableDefinitionId: string;
}

export interface ExportDashboardPageProps {
  api: ExportDashboardApi;
  formType?: string;
  onAction?: DashboardActionHandlers;
}

/**
 * Export definition dashboard page.
 * Lists export definitions grouped by table, with create/edit/delete actions.
 */
export function ExportDashboardPage({
  api,
  formType = "ExportDefinitionDashboard",
  onAction,
}: ExportDashboardPageProps) {
  const { navigationHandler } = useFormsApp();
  const toast = useToast();

  const dashboardForm = useControl<{
    request: any;
    definitionInfos: ExportDefinitionDashboardInfo[] | null;
  }>({
    request: defaultSearchOptions,
    definitionInfos: null,
  });

  const { definitionInfos } = dashboardForm.current.fields;

  useEffect(() => {
    loadExportDefinitions();
  }, []);

  return (
    <AppFormRenderer
      formType={formType}
      control={dashboardForm}
      renderOptions={{ actionOnClick: formActions }}
    />
  );

  async function loadExportDefinitions() {
    try {
      const definitions = await api.listExportDefinitions();
      const infos = flattenDefinitions(definitions);
      definitionInfos.setInitialValue(infos);
    } catch (e) {}
  }

  async function deleteExportDefinition(id: string) {
    try {
      await api.deleteExportDefinition(id);
      toast.addToast("Delete export definition successfully", {
        type: "success",
      });
      await loadExportDefinitions();
    } catch (e) {}
  }

  function formActions(
    actionId: string,
    actionData: any,
    _dataContext: ControlDataContext,
  ) {
    if (onAction) {
      const handler = onAction[actionId as keyof DashboardActionHandlers];
      if (handler) return (ctx: any) => handler(actionData, ctx);
    }
    return async () => {
      switch (actionId) {
        case "createExportDefinition":
          navigationHandler({ type: "exportCreate" });
          return;
        case "editExportDefinition":
          navigationHandler({
            type: "exportEdit",
            definitionId: actionData,
          });
          return;
        case "deleteExportDefinition":
          await deleteExportDefinition(actionData);
          return;
        default:
          return;
      }
    };
  }
}

function flattenDefinitions(
  definitions: ExportDefinitionGroupData[],
): ExportDefinitionDashboardInfo[] {
  return definitions.flatMap(
    ({ infos, tableDefinitionName, tableDefinitionId }) =>
      infos.map(({ id, name }) => ({
        id,
        name,
        tableDefinitionName,
        tableDefinitionId,
      })),
  );
}
