import {
  ControlDefinition,
  ControlRenderOptions,
  FormNode,
  FormRenderer,
  SchemaField,
} from "@react-typed-forms/schemas";
import { Control } from "@react-typed-forms/core";
import { EditorFormTree } from "./EditorFormTree";
import { EditorSchemaTree } from "./EditorSchemaTree";

export type SchemaLoader = (schemaId: string) => Promise<{
  fields: SchemaField[];
}>;

export type FormLoader<A> = (formId: A) => Promise<{
  controls: ControlDefinition[];
  schemaName: string;
  renderer?: FormRenderer;
  config?: any;
  formFields?: SchemaField[];
}>;

export interface BasicFormEditorProps<A> {
  formRenderer: FormRenderer;
  loadForm: FormLoader<A>;
  loadSchema: SchemaLoader;
  saveForm: (
    controls: ControlDefinition[],
    formId: A,
    config: any,
    formFields: SchemaField[],
  ) => Promise<any>;
  formId: A;
  formTitle?: string;
  className?: string;
  previewOptions?: ControlRenderOptions;
}

export interface BasicEditorState {
  formTree: EditorFormTree;
  schemaTree: EditorSchemaTree;
  formFields: Control<SchemaField[]>;
  schemaFields: Control<SchemaField[]>;
  selectedField: FormNode | undefined;
  previewMode: boolean;
  loaded: boolean;
  formTitle: string;
  config?: any;
}

export interface SimpleVisibilityCondition {
  field: string;
  operator: "equals" | "notEquals";
  value: any;
}

export enum BasicFieldType {
  TextInput = "TextInput",
  TextArea = "TextArea",
  Radio = "Radio",
  Checkbox = "Checkbox",
  DatePicker = "DatePicker",
  Dropdown = "Dropdown",
  SectionHeader = "SectionHeader",
}
