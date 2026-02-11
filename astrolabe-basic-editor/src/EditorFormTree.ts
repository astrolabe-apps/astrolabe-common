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
  trackedValue,
  unsafeRestoreControl,
} from "@react-typed-forms/core";

export class EditorFormTree extends FormTree {
  control: Control<ControlDefinition>;
  constructor(rootNodes: ControlDefinition[]) {
    super();
    this.control = newControl(groupedControl(rootNodes));
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

  addNode(parent: FormNode, child: ControlDefinition): FormNode {
    const childrenControl = this.getEditableChildren(parent)!;
    const newIndex = childrenControl.elements.length;
    const childControl = addElement(childrenControl, child);
    return parent.createChildNode(
      newIndex.toString(),
      trackedValue(childControl),
    );
  }
}
