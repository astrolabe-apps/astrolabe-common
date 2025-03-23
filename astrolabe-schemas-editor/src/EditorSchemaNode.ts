import { addElement, Control, trackedValue } from "@react-typed-forms/core";
import { SchemaField, SchemaNode } from "@react-typed-forms/schemas";
import { SchemaFieldForm } from "./schemaSchemas";

export class EditorSchemaNode implements SchemaNode {
  constructor(
    public tree: EditorSchemaTree,
    public parent: SchemaNode | undefined,
    public control: Control<SchemaFieldForm>,
  ) {}

  getChildNodes(withParent?: SchemaNode): SchemaNode[] {
    const parent = withParent ?? this;
    return this.control.fields.children.elements.map(
      (x) => new EditorSchemaNode(this.tree, parent, x),
    );
  }

  getSchema(schemaId: string): SchemaNode | undefined {
    return this.tree.getSchema(schemaId);
  }

  get id(): string {
    return this.control.uniqueId.toString();
  }
  get field(): SchemaField {
    return trackedValue(this.control);
  }
}

export class EditorSchemaTree {
  rootNode: EditorSchemaNode;

  constructor(
    public getSchemaTree: (id: string) => EditorSchemaTree,
    public root: Control<SchemaFieldForm>,
  ) {
    this.rootNode = new EditorSchemaNode(this, undefined, root);
  }

  getSchema(id: string): SchemaNode | undefined {
    return this.getSchemaTree(id).rootNode;
  }
}
