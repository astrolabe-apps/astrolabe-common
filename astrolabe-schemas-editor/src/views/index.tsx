import {
  ControlDefinition,
  ControlDefinitionExtension,
  ControlRenderOptions,
  createFormTreeWithRoot,
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
import { EditorFormNode } from "../EditorFormNode";

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
  checkbox: (control: Control<boolean>, label: string) => ReactNode;
  previewOptions?: ControlRenderOptions;
  validation?: (data: Control<any>, controls: FormNode) => Promise<any>;
  openForm: (formId: string) => void;
  extraPreviewControls?:
    | ReactNode
    | ((c: FormNode, data: Control<any>) => ReactNode);
  updateTabTitle: (tabId: string, title: string) => void;
  saveForm(c: Control<EditableForm>): void;
}

export interface FormInfo {
  id: string;
  name: string;
  folder?: string;
}

export function getViewAndParams(tabId: string): [string, string?] {
  return tabId.split(":", 2) as [string, string?];
}

export interface EditableForm {
  selectedControl?: SelectedControlNode;
  selectedField?: SchemaNode;
  root: ControlDefinition;
  schemaId: string;
  hideFields: boolean;
}

export function getEditorFormTree(cf: Control<EditableForm>) {
  return createFormTreeWithRoot(
    (t) => new EditorFormNode("", t, undefined, cf.fields.root),
    () => [],
  );
}
