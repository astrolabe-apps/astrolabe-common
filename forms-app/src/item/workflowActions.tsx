import { Control } from "@react-typed-forms/core";
import {
  ActionRendererProps,
  ActionStyle,
  ControlDefinition,
  createAction,
  GroupRenderType,
  groupedControl,
  RendererRegistration,
} from "@react-typed-forms/schemas";
import {
  createWizardRenderer,
  CustomNavigationProps,
} from "@react-typed-forms/schemas-html";
import clsx from "clsx";
import { FormConfigData, FormLayoutMode, PageNavigationStyle } from "../types";
import React from "react";

/**
 * Wraps controls in a wizard/tabs container based on form config.
 * SinglePage forms are wrapped as a single-page wizard so that
 * the wizard navigation renderer (and its action buttons) still fires.
 */
export function wrapFormControls(
  controls: ControlDefinition[],
  config: FormConfigData,
): ControlDefinition[] {
  if (config.layoutMode !== FormLayoutMode.MultiPage) {
    return [
      groupedControl(
        [groupedControl(controls, "", { groupOptions: { type: GroupRenderType.Standard } })],
        "",
        { groupOptions: { type: GroupRenderType.Wizard } },
      ),
    ];
  }
  const type =
    config.navigationStyle === PageNavigationStyle.Tabs
      ? GroupRenderType.Tabs
      : GroupRenderType.Wizard;
  return [groupedControl(controls, "", { groupOptions: { type } })];
}

/**
 * Creates a wizard navigation renderer with custom action buttons.
 */
export function createActionWizardNavigation(
  toActions: (props: CustomNavigationProps) => ActionRendererProps[],
): RendererRegistration {
  function renderNavigation(props: CustomNavigationProps) {
    const { formRenderer, className, next, prev } = props;
    const buttons = toActions(props);
    return (
      <div className={className}>
        {formRenderer.renderAction({
          ...prev,
          className: clsx("min-w-32", prev.disabled ? "invisible" : ""),
        })}
        <div className="flex gap-2">
          {buttons.map((x, i) => renderAction({ ...x, key: i }))}
          {!next.disabled && renderAction(next)}
        </div>
      </div>
    );

    function renderAction(action: ActionRendererProps) {
      return formRenderer.renderAction({ ...action, className: "min-w-32" });
    }
  }

  return createWizardRenderer({
    renderNavigation,
    classes: { contentClass: "min-h-[60vh]" },
  });
}

/**
 * Creates workflow action buttons from available actions.
 * Actions are strings (e.g. "Submit", "Approve") — no enum dependency.
 */
export function createWorkflowActions(
  actions: Control<string[] | undefined>,
  filterActions: (
    action: string,
    navProps: CustomNavigationProps,
  ) => boolean,
  doAction: (action: string | null) => void,
  options?: { doCancel?: () => void; hideSave?: boolean },
) {
  const { doCancel, hideSave } = options ?? {};
  return (navProps: CustomNavigationProps) => {
    const cancelAction = doCancel
      ? [
          createAction("cancel", doCancel, "Cancel", {
            actionStyle: ActionStyle.Link,
          }),
        ]
      : [];
    const saveAction = hideSave
      ? []
      : [createAction("save", () => validatedAction(null), "Save")];
    const otherActions =
      actions.value
        ?.filter((x) => filterActions(x, navProps))
        .map((x) =>
          createAction(x, () => validatedAction(x), x, {
            actionStyle: ActionStyle.Secondary,
          }),
        ) ?? [];
    return [...cancelAction, ...saveAction, ...otherActions];

    async function validatedAction(action: string | null) {
      const valid = await navProps.validatePage();
      if (valid) {
        doAction(action);
      }
    }
  };
}
