import { addElement, Control, trackedValue } from "@react-typed-forms/core";
import {
  ControlDefinition,
  FormNode,
  FormTree,
} from "@react-typed-forms/schemas";

export class EditorFormNode implements FormNode {
  constructor(
    public id: string,
    public tree: FormTree,
    public parent: FormNode | undefined,
    private control: Control<ControlDefinition>,
  ) {}

  addChild(c: ControlDefinition): Control<ControlDefinition> {
    return addElement(this.control.fields.children, c);
  }
  getChildNodes(dontFollowRef?: boolean): FormNode[] {
    return this.control.fields.children.elements.map(
      (x) => new EditorFormNode(x.uniqueId.toString(), this.tree, this, x),
    );
  }

  get definition(): ControlDefinition {
    return trackedValue(this.control);
  }
}

export class EditorFormTree extends FormTree {
  rootNode: FormNode;
  getById(id: string): FormNode | undefined {
    throw new Error("Method not implemented.");
  }
  addNode(parent: FormNode, control: ControlDefinition): FormNode {
    throw new Error("Method not implemented.");
  }
  getForm(formId: string): FormTree | undefined {
    throw new Error("Method not implemented.");
  }
  constructor(public root: Control<ControlDefinition>) {
    super();
    this.rootNode = new EditorFormNode("", this, undefined, root);
  }
}
