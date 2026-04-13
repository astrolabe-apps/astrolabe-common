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
  createSyncEffect,
  ensureMetaValue,
  newControl,
  removeElement,
  trackedValue,
  unsafeRestoreControl,
  updateElements,
} from "@react-typed-forms/core";

export class EditorSchemaTree extends SchemaTree {
  rootNode: SchemaNode;
  getSchemaTree(schemaId: string): SchemaTree | undefined {
    return this.lookupSchema(schemaId);
  }

  constructor(
    private rootNodes: Control<SchemaField[]>,
    public schemaId: string,
    private lookupSchema: (schemaId: string) => SchemaTree | undefined,
    private formNodes?: Control<SchemaField[]>,
  ) {
    super();
    const allRootFields = ensureMetaValue(rootNodes, "AllRootNodes", () => {
      const comp = newControl<SchemaField[]>([]);
      createSyncEffect(() => {
        const allElems = formNodes
          ? [...rootNodes.elements, ...formNodes.elements]
          : rootNodes.elements;
        updateElements(comp, () => allElems);
      }, comp);
      return comp;
    });
    this.rootNode = new SchemaNode(
      "",
      compoundField("", [])(this.schemaId),
      this,
      undefined,
      () => trackedValue(allRootFields),
    );
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
    return this.rootNodes;
  }

  getFormFields(): Control<SchemaField[]> | undefined {
    return this.formNodes;
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
