import React, { useMemo } from "react";
import {
  RenderOptional,
  useControl,
  useControlEffect,
} from "@react-typed-forms/core";
import { CustomNavigationProps } from "@react-typed-forms/schemas-html";
import { useToast } from "@astroapps/client";
import { useFormsApp } from "../FormsAppProvider";
import { DynamicFormRenderer } from "./DynamicFormRenderer";
import {
  createActionWizardNavigation,
  createWorkflowActions,
} from "./workflowActions";
import {
  FileOperations,
  ItemViewData,
  WorkflowActions,
} from "../types";
import { ItemEditApi } from "../api";

export interface ItemEditPageProps {
  itemId: string | undefined;
  api: ItemEditApi;
  fileOperations?: FileOperations;
  filterActions?: (
    action: string,
    navProps: CustomNavigationProps,
  ) => boolean;
  hideSave?: boolean;
}

/**
 * Item edit page with dynamic form rendering and workflow actions.
 * Consumer provides itemId (from URL), API adapter, and optional overrides.
 */
export function ItemEditPage({
  itemId,
  api,
  fileOperations,
  filterActions = defaultFilterActions,
  hideSave,
}: ItemEditPageProps) {
  const { ui, navigationHandler } = useFormsApp();
  const toast = useToast();

  const editItem = useControl<ItemViewData>();
  const { metadata, formType, actions } = editItem.fields;

  const renderers = useMemo(
    () => [
      createActionWizardNavigation(
        createWorkflowActions(actions, filterActions, doAction, {
          doCancel: () => navigationHandler({ type: "dashboard" }),
          hideSave,
        }),
      ),
    ],
    [actions],
  );

  useControlEffect(
    () => itemId,
    (v) => {
      if (!v) return;
      loadFormData(v);
    },
    true,
  );

  return (
    <RenderOptional
      control={editItem}
      notDefined={<ui.CircularProgress />}
    >
      {(c) => (
        <DynamicFormRenderer
          formId={formType.value!}
          formData={metadata}
          customRenderers={renderers}
          getFormForRender={api.getFormForRender}
          fileOperations={fileOperations}
        />
      )}
    </RenderOptional>
  );

  async function loadFormData(id: string) {
    const result = await api.getItemView(id);
    editItem.setInitialValue(result);
  }

  async function doAction(action: string | null) {
    try {
      await api.editItem(itemId!, {
        metadata: metadata.value,
        action: action ?? null,
      });
      toast.addToast("Saved successfully", { type: "success" });
      navigationHandler({ type: "dashboard" });
    } catch (e) {
      toast.addToast("Failed to save", { type: "error" });
      console.error(e);
    }
  }
}

function defaultFilterActions(
  action: string,
  navProps: CustomNavigationProps,
): boolean {
  return (
    action !== WorkflowActions.Export &&
    action === WorkflowActions.Submit &&
    navProps.page === navProps.totalPages - 1
  );
}
