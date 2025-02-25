import { FormNode, SchemaNode } from "@react-typed-forms/schemas";

export interface ControlNode extends SelectedControlNode {
  id: string;
  children: ControlNode[] | null;
}

export type SelectedControlNode = {
  form: FormNode;
  schema: SchemaNode;
  dataSchema?: SchemaNode;
};
