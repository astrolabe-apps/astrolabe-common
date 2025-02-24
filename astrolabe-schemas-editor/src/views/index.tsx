import {
  ControlDefinition,
  ControlDefinitionExtension,
  ControlRenderOptions,
  FormNode,
  FormRenderer, FormTree,
  GroupedControlsDefinition,
  RendererRegistration,
  SchemaNode,
  SchemaTreeLookup,
} from "@react-typed-forms/schemas";
import { Control } from "@react-typed-forms/core";
import { SelectedControlNode } from "../types";
import { ReactNode } from "react";
import { EditorFormTree } from "../EditorFormNode";

export interface ViewContext {
  schemaLookup: SchemaTreeLookup;
  formList: FormInfo[];
  currentForm: Control<string | undefined>;
  getForm: (formId: string) => Control<EditableForm | undefined>;
  getCurrentForm: () => Control<EditableForm | undefined> | undefined;
  editorControls: FormTree;
  editorFields: SchemaNode;
  createEditorRenderer: (registrations: RendererRegistration[]) => FormRenderer;
  extensions?: ControlDefinitionExtension[];
  button: (onClick: () => void, action: string, actionId?: string) => ReactNode;
  checkbox: (control: Control<boolean>, label: string) => ReactNode;
  previewOptions?: ControlRenderOptions;
  validation?: (data: Control<any>, controls: FormNode) => Promise<any>;
  openForm: (formId: string) => void;
  extraPreviewControls?:
    | ReactNode
    | ((c: FormNode, data: Control<any>) => ReactNode);
  updateTabTitle: (tabId: string, title: string) => void;
  editorPanelClass?: string;
  saveForm(c: Control<EditableForm>): void;
}

export interface FormInfo {
  id: string;
  name: string;
  folder?: string | null;
}

export function getViewAndParams(tabId: string): [string, string?] {
  return tabId.split(":", 2) as [string, string?];
}

export interface EditableForm {
  selectedControl?: SelectedControlNode;
  selectedField?: SchemaNode;
  selectedControlId?: string;
  root: ControlDefinition;
  renderer: FormRenderer;
  schemaId: string;
  hideFields: boolean;
  formId: string;
  name: string;
}

export function getEditorFormTree(cf: Control<EditableForm>) {
  return new EditorFormTree(cf.fields.root);
}
