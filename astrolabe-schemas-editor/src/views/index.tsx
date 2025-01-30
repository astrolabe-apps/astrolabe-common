import {
  ControlDefinition,
  ControlDefinitionExtension,
  ControlRenderOptions,
  FormNode,
  FormRenderer,
  GroupedControlsDefinition,
  RendererRegistration,
  SchemaNode,
  SchemaTreeLookup,
} from "@react-typed-forms/schemas";
import { Control } from "@react-typed-forms/core";
import { SelectedControlNode } from "../types";
import { ReactNode } from "react";

export interface ViewContext {
  schemaLookup: SchemaTreeLookup;
  formList: FormInfo[];
  currentForm: Control<string | undefined>;
  getForm: (formId: string) => Control<EditableForm | undefined>;
  getCurrentForm: () => Control<EditableForm | undefined> | undefined;
  editorControls: GroupedControlsDefinition;
  editorFields: SchemaNode;
  createEditorRenderer: (registrations: RendererRegistration[]) => FormRenderer;
  extensions?: ControlDefinitionExtension[];
  formRenderer: FormRenderer;
  button: (onClick: () => void, action: string, actionId?: string) => ReactNode;
  previewOptions?: ControlRenderOptions;
  validation?: (data: Control<any>, controls: FormNode) => Promise<any>;
  openForm: (formId: string) => void;
  extraPreviewControls?:
    | ReactNode
    | ((c: FormNode, data: Control<any>) => ReactNode);
}

export interface FormInfo {
  id: string;
  name: string;
}

export function getViewAndParams(tabId: string): [string, string?] {
  return tabId.split(":", 2) as [string, string?];
}

export interface EditableForm {
  selectedControl?: SelectedControlNode;
  selectedField?: SchemaNode;
  controls: ControlDefinition[];
  schemaId: string;
}
