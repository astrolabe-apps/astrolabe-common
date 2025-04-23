import {
  compoundField,
  CompoundField,
  isCompoundField,
  SchemaField,
  SchemaNode,
  SchemaTree,
} from "@react-typed-forms/schemas";
import {
  addElement,
  Control,
  newControl,
  removeElement,
  trackedValue,
  unsafeRestoreControl,
} from "@react-typed-forms/core";

export class EditorSchemaTree extends SchemaTree {
  control: Control<SchemaField>;
  getSchemaTree(schemaId: string): SchemaTree | undefined {
    return this.lookupSchema(schemaId);
  }

  constructor(
    rootNodes: SchemaField[],
    public schemaId: string,
    private lookupSchema: (schemaId: string) => SchemaTree | undefined,
  ) {
    super();
    this.control = newControl(compoundField("", rootNodes)(""));
  }

  get rootNode(): SchemaNode {
    return new SchemaNode("", trackedValue(this.control), this);
  }

  createChildNode(parent: SchemaNode, field: SchemaField): SchemaNode {
    const fieldControl = unsafeRestoreControl(field);
    return new SchemaNode(
      parent.id +
        "/" +
        (fieldControl ? fieldControl.uniqueId.toString() : field.field),
      field,
      this,
      parent,
    );
  }

  getEditableNode(node: SchemaNode): Control<SchemaField> | undefined {
    return unsafeRestoreControl(node.field);
  }

  getEditableChildren(
    x?: SchemaNode,
  ): Control<SchemaField[] | null | undefined> | undefined {
    if (x && isCompoundField(x.field)) {
      const resolvedParent = x.getResolvedParent();
      const fieldControl = resolvedParent
        ? (unsafeRestoreControl(resolvedParent.field) as Control<CompoundField>)
        : undefined;
      return fieldControl?.fields.children;
    }
    return undefined;
  }

  getRootFields(): Control<SchemaField[]> {
    return this.getEditableChildren(this.rootNode)!.as();
  }

  addNode(parent: SchemaNode, child: SchemaField): SchemaNode {
    const childrenControl = this.getEditableChildren(parent)!;
    const childControl = addElement(childrenControl, child);
    return parent.createChildNode(trackedValue(childControl));
  }

  deleteNode(n: SchemaNode) {
    const parent = n.parent;
    const child = this.getEditableNode(n);
    if (parent && child) {
      const childrenControl = this.getEditableChildren(parent)!;
      removeElement(childrenControl, child);
    }
  }
}
