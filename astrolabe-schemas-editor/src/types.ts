import { Control } from "@react-typed-forms/core";
import {
  ControlDefinition,
  FormNode,
  FormRenderer,
  SchemaField,
  SchemaNode,
} from "@react-typed-forms/schemas";

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
}>;

export interface Snippet {
  id: string;
  name: string;
  group?: string | null;
  definition: ControlDefinition;
}
