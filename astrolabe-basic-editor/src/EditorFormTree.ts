import {
  ControlDefinition,
  FormNode,
  FormTree,
  groupedControl,
} from "@react-typed-forms/schemas";
import {
  addElement,
  Control,
  newControl,
  setFields,
  trackedValue,
  unsafeRestoreControl,
  updateElements,
} from "@react-typed-forms/core";

export class EditorFormTree extends FormTree {
  control: Control<ControlDefinition>;
  constructor(rootNodes: Control<ControlDefinition[]>) {
    super();
    this.control = newControl(groupedControl([]));
    setFields(this.control, { children: rootNodes });
  }

  get rootNode(): FormNode {
    return new FormNode("", trackedValue(this.control), this);
  }

  getNodeByRefId(id: string): FormNode | undefined {
    return this.rootNode.visit((x) => (x.definition.id === id ? x : undefined));
  }

  getByRefId(id: string): ControlDefinition | undefined {
    return this.rootNode.visit((x) =>
      x.definition.id === id ? x.definition : undefined,
    );
  }
  getForm(formId: string): FormTree | undefined {
    throw new Error("Method not implemented.");
  }

  getChildId(
    parentId: string,
    childId: string,
    control: ControlDefinition,
  ): string {
    const ccd = unsafeRestoreControl(control);
    if (ccd) return ccd.uniqueId.toString();
    return parentId + "/" + childId;
  }

  getEditableChildren(
    x?: FormNode,
  ): Control<ControlDefinition[] | null | undefined> | undefined {
    return x && unsafeRestoreControl(x.definition)!.fields.children;
  }

  getEditableDefinition(
    node: FormNode,
  ): Control<ControlDefinition> | undefined {
    return unsafeRestoreControl(node.definition);
  }

  getRootDefinitions(): Control<ControlDefinition[]> {
    return this.getEditableChildren(this.rootNode)!.as();
  }

  findNodeWithParent(
    nodeId: string,
  ): { node: FormNode; parent: FormNode; indexInParent: number } | undefined {
    return this.rootNode.visit((x) => {
      const children = x.getUnresolvedChildNodes();
      for (let i = 0; i < children.length; i++) {
        if (children[i].id === nodeId) {
          return { node: children[i], parent: x, indexInParent: i };
        }
      }
      return undefined;
    });
  }

  addNode(
    parent: FormNode,
    child: ControlDefinition,
    afterNode?: FormNode,
    insertAfter?: boolean,
  ): FormNode {
    const childrenControl = this.getEditableChildren(parent)!;
    const insertControl = afterNode
      ? this.getEditableDefinition(afterNode)
      : undefined;
    const childControl = addElement(
      childrenControl,
      child,
      insertControl,
      insertAfter,
    );
    const newIndex = childrenControl.elements.indexOf(childControl);
    return parent.createChildNode(
      newIndex.toString(),
      trackedValue(childControl),
    );
  }
}
