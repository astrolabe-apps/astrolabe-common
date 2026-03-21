import React, { useMemo } from "react";
import {
  Fcheckbox,
  RenderOptional,
  useControl,
  useControlEffect,
} from "@react-typed-forms/core";
import {
  ControlActionHandler,
  ControlDataContext,
  DisplayRendererProps,
} from "@react-typed-forms/schemas";
import { CustomNavigationProps } from "@react-typed-forms/schemas-html";
import { useToast } from "@astroapps/client";
import { useFormsApp } from "../FormsAppProvider";
import { AppFormRenderer } from "../AppFormRenderer";
import { DynamicFormRenderer } from "./DynamicFormRenderer";
import {
  createActionWizardNavigation,
  createWorkflowActions,
} from "./workflowActions";
import {
  FileOperations,
  ItemNoteEditData,
  ItemViewData,
  WorkflowActions,
} from "../types";
import { ItemViewApi } from "../api";

const DefaultItemNoteEdit: ItemNoteEditData = {
  message: "",
  internal: false,
};

export interface ItemViewPageProps {
  itemId: string | undefined;
  api: ItemViewApi;
  fileOperations?: FileOperations;
  viewFormType?: string;
  filterActions?: (
    action: string,
    navProps: CustomNavigationProps,
  ) => boolean;
  onAction?: ControlActionHandler;
}

/**
 * Item view page with workflow actions, dynamic form display, and note dialog.
 * Consumer provides itemId (from URL), API adapter, and optional overrides.
 */
export function ItemViewPage({
  itemId,
  api,
  fileOperations,
  viewFormType = "AdminItemViewForm",
  filterActions = defaultFilterActions,
  onAction,
}: ItemViewPageProps) {
  const { ui, navigationHandler } = useFormsApp();
  const toast = useToast();

  const editItem = useControl<ItemViewData>();
  const { formType, metadata, actions } = editItem.fields;

  const renderers = useMemo(
    () => [
      createActionWizardNavigation(
        createWorkflowActions(actions, filterActions, doAction, {
          doCancel: () => navigationHandler({ type: "dashboard" }),
          hideSave: true,
        }),
      ),
    ],
    [actions],
  );

  const [openDialog, Dialog] = ui.useDialog();

  const itemNoteEdit = useControl<ItemNoteEditData>(DefaultItemNoteEdit);
  const { message, internal } = itemNoteEdit.fields;

  const busy = useControl(false);
  const { Button, Textfield, CircularProgress } = ui;

  useControlEffect(
    () => itemId,
    async (v) => {
      if (!v) return;
      await loadFormData(v);
    },
    true,
  );

  return (
    <RenderOptional
      control={editItem}
      notDefined={<CircularProgress />}
    >
      {(c) => (
        <>
          <AppFormRenderer
            formType={viewFormType}
            control={c}
            renderOptions={{
              customDisplay,
              actionOnClick: formActions,
            }}
          />
          <Dialog
            actions={[
              <Button
                key="add"
                disabled={message.value === "" || busy.value}
                onClick={addNote}
              >
                Add
              </Button>,
            ]}
            title="Add Note"
            onCancel={() => itemNoteEdit.setInitialValue(DefaultItemNoteEdit)}
          >
            <div className="flex flex-col gap-2">
              <Textfield
                control={message}
                label="Message"
                inputClass="border-2 rounded-md p-2"
              />
              <div className="flex flex-row items-center gap-2">
                <Fcheckbox id="internal" control={internal} />
                <label htmlFor="internal" className="select-none">
                  Internal
                </label>
              </div>
            </div>
          </Dialog>
        </>
      )}
    </RenderOptional>
  );

  async function addNote() {
    if (!itemId || !itemNoteEdit.value) return;
    try {
      busy.value = true;
      await api.addItemNote(itemId, itemNoteEdit.value);
      toast.addToast("Note added successfully", { type: "success" });
      openDialog(false);
      itemNoteEdit.setInitialValue(DefaultItemNoteEdit);
      await loadFormData(itemId);
    } catch (e) {
      toast.addToast("Failed to add the note", { type: "error" });
    } finally {
      busy.value = false;
    }
  }

  function customDisplay(customId: string, ctx: DisplayRendererProps) {
    switch (customId) {
      case "itemForm":
        return (
          <DynamicFormRenderer
            formId={formType.value!}
            formData={metadata}
            readonly
            customRenderers={renderers}
            getFormForRender={api.getFormForRender}
            fileOperations={fileOperations}
          />
        );
      default:
        return <></>;
    }
  }

  function formActions(
    actionId: string,
    actionData: any,
    dataContext: ControlDataContext,
  ) {
    if (onAction) {
      const handler = onAction(actionId, actionData, dataContext);
      if (handler) return handler;
    }
    if (actionId === "addNote") {
      return async () => {
        openDialog(true);
      };
    }
    return undefined;
  }

  async function doAction(action: string | null) {
    if (!itemId || !action) return;
    try {
      await api.performAction(itemId, action);
      toast.addToast("Action performed successfully", { type: "success" });
      await loadFormData(itemId);
    } catch (e) {
      toast.addToast("Failed to perform action", { type: "error" });
    }
  }

  async function loadFormData(id: string) {
    try {
      const data = await api.getItemView(id);
      editItem.setInitialValue(data);
    } catch (e) {}
  }
}

function defaultFilterActions(
  action: string,
  navProps: CustomNavigationProps,
): boolean {
  return (
    action !== WorkflowActions.Export &&
    navProps.page === navProps.totalPages - 1
  );
}
