import { Control } from "@react-typed-forms/core";
import { FormNode, SchemaDataNode } from "../index";
import {
  ActionControlDefinition,
  ControlDefinitionType,
  DataControlDefinition,
  DataRenderType,
  DefaultRendererOptions,
  DisplayControlDefinition,
  GroupedControlsDefinition,
  SchemaInterface,
} from "@react-typed-forms/schemas";
import React, { FC, ReactNode } from "react";
import { FormNodeState } from "../RenderNode";
import { createDefaultLayout } from "./DefaultLayout";
import { defaultRenderData } from "./defaultRenderData";
import { defaultRenderGroup } from "./defaultRenderGroup";
import { defaultRenderDisplay } from "./defaultRenderDisplay";
import {
  createDefaultActionRenderer,
  defaultRenderAction,
} from "./defaultRenderAction";
import {
  createDefaultArrayActions,
  createDefaultArrayRenderer,
} from "./defaultArrayRenderer";

export interface ControlRenderProps {
  state: Control<FormNodeState>;
  formNode: FormNode;
  dataNode: SchemaDataNode;
  formOptions: FormOptions;
}

export interface FormOptions {
  schemaInterface: SchemaInterface;
  renderer: FormRenderer;
  RenderForm: FC<Omit<ControlRenderProps, "state">>;
  performAction?: (actionId: string, actionData: any) => void;
}

export interface FormLayoutProps {
  state: Control<FormNodeState>;
  formOptions: FormOptions;
  children: ReactNode | (() => ReactNode);
}

export interface ActionRendererProps {
  actionId: string;
  actionText: string;
  actionData?: any;
  disabled?: boolean;
  perform?: () => void;
  className?: string | null;
  style?: React.CSSProperties;
}

export interface ArrayRendererProps {
  addAction?: ActionRendererProps;
  removeAction?: (elemIndex: number) => ActionRendererProps;
  renderElement: (elemIndex: number) => ReactNode;
  arrayControl: Control<any[] | undefined | null>;
  className?: string;
  style?: React.CSSProperties;
  renderAction: (action: ActionRendererProps) => ReactNode;
}

export interface DefaultFormActions {
  add: ActionRendererProps;
  remove: ActionRendererProps;
}
export interface FormRenderer {
  render: (props: ControlRenderProps) => ReactNode;
  RenderLayout: FC<FormLayoutProps>;
  renderAction: (props: ActionRendererProps) => ReactNode;
  renderArray: (props: ArrayRendererProps) => ReactNode;
  defaultActions: DefaultFormActions;
}

export function createDefaultFormRenderer(
  defaults: DefaultRendererOptions = {},
): FormRenderer {
  return {
    render,
    RenderLayout: createDefaultLayout(defaults.layout),
    renderAction: createDefaultActionRenderer(defaults.action),
    renderArray: createDefaultArrayRenderer(defaults.array),
    defaultActions: createDefaultArrayActions(defaults.array),
  };
  function render(props: ControlRenderProps) {
    const { definition } = props.formNode;
    const controlType = definition.type;
    switch (controlType) {
      case ControlDefinitionType.Data:
        return defaultRenderData(
          props,
          definition as DataControlDefinition,
          defaults.data ?? {},
        );
      case ControlDefinitionType.Group:
        return defaultRenderGroup(
          props,
          definition as GroupedControlsDefinition,
          defaults.group ?? {},
        );
      case ControlDefinitionType.Display:
        return defaultRenderDisplay(
          props,
          definition as DisplayControlDefinition,
          defaults.display ?? {},
        );
      case ControlDefinitionType.Action:
        return defaultRenderAction(
          props,
          definition as ActionControlDefinition,
        );
    }
    return <>HAI: {controlType}</>;
  }
}
