import {
  ControlDefinitionExtension,
  ControlRenderOptions,
  FormNode,
  FormRenderer,
  FormTree,
  RendererRegistration,
  SchemaNode,
  SchemaTree,
} from "@react-typed-forms/schemas";
import { Control } from "@react-typed-forms/core";
import { SelectedControlNode, Snippet } from "../types";
import { ReactNode } from "react";
import { EditorFormTree } from "../EditorFormTree";
import { EditorSchemaTree } from "../EditorSchemaTree";

export interface ViewContext {
  formList: FormInfo[];
  listHeader?: ReactNode;
  currentForm: Control<string | undefined>;
  getForm: (formId: string) => Control<EditableForm | undefined>;
  getCurrentForm: () => Control<EditableForm | undefined> | undefined;
  editorControls: FormTree;
  schemaEditorControls: FormTree;
  editorFields: SchemaNode;
  schemaEditorFields: SchemaNode;
  createEditorRenderer: (registrations: RendererRegistration[]) => FormRenderer;
  extensions?: ControlDefinitionExtension[];
  button: (onClick: () => void, action: string, actionId?: string) => ReactNode;
  checkbox: (
    control: Control<boolean | undefined | null>,
    label: string,
  ) => ReactNode;
  previewOptions?: ControlRenderOptions;
  validation?: (data: Control<any>, controls: FormNode) => Promise<any>;
  openForm: (formId: string) => void;
  extraPreviewControls?:
    | ReactNode
    | ((c: FormNode, data: Control<any>) => ReactNode);
  updateTabTitle: (tabId: string, title: string) => void;
  editorPanelClass?: string;
  saveForm(c: Control<EditableForm>): void;
  saveSchema?(c: Control<EditableForm>): void;
  snippets?: Snippet[];
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
  formTree: EditorFormTree;
  renderer: FormRenderer;
  schema: EditorSchemaTree;
  hideFields: boolean;
  showJson?: boolean;
  formId: string;
  name: string;
}
