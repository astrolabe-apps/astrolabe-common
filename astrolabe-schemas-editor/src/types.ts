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
}>;
