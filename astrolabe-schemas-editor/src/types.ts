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
import { ClaudeService } from "./services/ClaudeService";

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
  formFields?: SchemaField[];
}>;

export interface Snippet {
  id: string;
  name: string;
  group?: string | null;
  definition: ControlDefinition;
}

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
  setupPreview?: (previewData: Control<PreviewData>) => void;
  validation?: (data: Control<any>, controls: FormNode) => Promise<any>;
  openForm: (formId: string) => void;
  extraPreviewControls?:
    | ReactNode
    | ((c: FormNode, data: Control<any>) => ReactNode);
  updateTabTitle: (tabId: string, title: string) => void;
  editorPanelClass?: string;
  saveForm(c: Control<EditableForm>): void;
  saveSchema?(c: Control<EditableForm>): void;
  editorFormRenderer: FormRenderer;
  snippets?: Snippet[];
  getSchemaForForm(form: Control<EditableForm>): EditorSchemaTree;
  claudeService?: ClaudeService;
}

export interface FormInfo {
  id: string;
  name: string;
  folder?: string | null;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
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
  conversationHistory?: ConversationMessage[];
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
