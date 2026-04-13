import { Control } from "@react-typed-forms/core";
import {
  ControlDefinition,
  ControlDefinitionExtension,
  ControlRenderOptions,
  FormNode,
  FormRenderer,
  FormTree,
  RendererRegistration,
  SchemaField,
  SchemaNode,
} from "@react-typed-forms/schemas";
import { ReactNode } from "react";
import { EditorFormTree } from "./EditorFormTree";
import { EditorSchemaTree } from "./EditorSchemaTree";
import { RenderOptions } from "@react-typed-forms/schemas";

export interface ControlNode extends SelectedControlNode {
  id: string;
  children: ControlNode[] | null;
}

export type SelectedControlNode = {
  form: FormNode;
  schema: SchemaNode;
  dataSchema?: SchemaNode;
};

export type SchemaLoader = (schemaId: string) => Promise<{
  fields: SchemaField[];
}>;

export type FormLoader<A> = (formId: A) => Promise<{
  controls: ControlDefinition[];
  schemaName: string;
  renderer?: FormRenderer;
  config?: any;
  configSchema?: SchemaField[];
  configOptions?: ControlRenderOptions;
  formFields?: SchemaField[];
}>;

export interface Snippet {
  id: string;
  name: string;
  group?: string | null;
  definition: ControlDefinition;
}

export interface ViewContext {
  // Infrastructure (created by the hook)
  editorControls: FormTree;
  schemaEditorControls: FormTree;
  editorFields: SchemaNode;
  schemaEditorFields: SchemaNode;
  createEditorRenderer: (registrations: RendererRegistration[]) => FormRenderer;
  editorFormRenderer: FormRenderer;
  button: (onClick: () => void, action: string, actionId?: string) => ReactNode;
  checkbox: (
    control: Control<boolean | undefined | null>,
    label: string,
  ) => ReactNode;
  extensions?: ControlDefinitionExtension[];
  editorPanelClass?: string;

  // Core form access
  getCurrentForm: () => Control<EditableForm | undefined> | undefined;
  getSchemaForForm(form: Control<EditableForm>): EditorSchemaTree;
}

export interface FormListContext {
  formList: FormInfo[];
  listHeader?: ReactNode;
  currentForm: Control<string | undefined>;
  openForm: (formId: string) => void;
}

export interface FormEditContext {
  getForm: (formId: string) => Control<EditableForm | undefined>;
  saveForm(c: Control<EditableForm>): void;
  saveSchema?(c: Control<EditableForm>): void;
  updateTabTitle: (tabId: string, title: string) => void;
}

export interface PreviewContext {
  previewOptions?: ControlRenderOptions;
  validation?: (data: Control<any>, controls: FormNode) => Promise<any>;
  setupPreview?: (previewData: Control<PreviewData>) => void;
  extraPreviewControls?:
    | ReactNode
    | ((c: FormNode, data: Control<any>) => ReactNode);
}

export interface SnippetsContext {
  snippets?: Snippet[];
}

export interface BasicFormEditorViewContext
  extends ViewContext,
    FormListContext,
    FormEditContext,
    PreviewContext,
    SnippetsContext {}

export interface FormInfo {
  id: string;
  name: string;
  folder?: string | null;
}

export interface EditableForm {
  selectedControl?: SelectedControlNode;
  selectedField?: SchemaNode;
  selectedControlId?: string;
  formTree: EditorFormTree;
  renderer: FormRenderer;
  schemaName: string;
  formSchema: SchemaField[];
  hideFields: boolean;
  showJson?: boolean;
  showConfig?: boolean;
  formId: string;
  name: string;
  config?: any;
  configSchema?: SchemaNode;
  configOptions?: ControlRenderOptions;
}

export interface PreviewData {
  formId: string;
  showing: boolean;
  showJson: boolean;
  showRawEditor: boolean;
  showMetadata: boolean;
  data: any;
  readonly: boolean;
  disabled: boolean;
  displayOnly: boolean;
}
