import {
  ControlDefinition,
  createFormTree,
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
  private externalFormTrees: Record<string, FormTree> = {};
  constructor(
    rootNodes: ControlDefinition[],
    private externalForms?: Record<string, ControlDefinition[]>,
  ) {
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
    if (this.externalFormTrees[formId]) return this.externalFormTrees[formId];
    const controls = this.externalForms?.[formId];
    if (controls) {
      const tree = createFormTree(controls, this);
      this.externalFormTrees[formId] = tree;
      return tree;
    }
    return undefined;
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
