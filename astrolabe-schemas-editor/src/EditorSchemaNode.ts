import {
  Control,
  trackedValue,
  unsafeRestoreControl,
} from "@react-typed-forms/core";
import {
  createSchemaNode,
  missingField,
  SchemaField,
  SchemaNode,
} from "@react-typed-forms/schemas";
import { SchemaFieldForm } from "./schemaSchemas";

export class EditorSchemaNode extends SchemaNode {
  constructor(
    public lookup: EditorSchemaTree,
    parent: SchemaNode | undefined,
    public control: Control<SchemaFieldForm>,
  ) {
    const thisId = control.current.fields.field.value;
    super(parent ? parent.id + "/" + thisId : thisId, lookup, parent);
  }

  getChildFields(): string[] {
    return this.control.fields.children.elements.map(
      (x) => x.fields.field.value,
    );
  }
  getChildField(field: string): SchemaField {
    const fieldControl = this.control.fields.children.elements.find(
      (x) => x.fields.field.value === field,
    );
    return fieldControl ? trackedValue(fieldControl) : missingField(field);
  }

  createChildNode(field: SchemaField): SchemaNode {
    const c = unsafeRestoreControl(field);
    if (c) {
      return new EditorSchemaNode(this.lookup, this, c.as());
    }
    return createSchemaNode(field, this.lookup, this);
  }

  getChildNodes(): SchemaNode[] {
    const parent = this;
    return this.control.fields.children.elements.map(
      (x) => new EditorSchemaNode(this.lookup, parent, x),
    );
  }

  getSchema(schemaId: string): SchemaNode | undefined {
    return this.lookup.getSchema(schemaId);
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
