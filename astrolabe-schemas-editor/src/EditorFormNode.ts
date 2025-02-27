import { addElement, Control, trackedValue } from "@react-typed-forms/core";
import {
  ControlDefinition,
  FormNode,
  FormTree,
} from "@react-typed-forms/schemas";

export class EditorFormNode implements FormNode {
  constructor(
    public tree: EditorFormTree,
    public parent: FormNode | undefined,
    private control: Control<ControlDefinition>,
  ) {}

  addChild(control: ControlDefinition): FormNode {
    const defControl = addElement(this.control.fields.children, control);
    return new EditorFormNode(this.tree, this, defControl);
  }

  get id(): string {
    return this.control.uniqueId.toString();
  }
  getChildNodes(): FormNode[] {
    return this.control.fields.children.elements.map(
      (x) => new EditorFormNode(this.tree, this, x),
    );
  }

  get definition(): ControlDefinition {
    return trackedValue(this.control);
  }
}

export class EditorFormTree extends FormTree {
  rootNode: EditorFormNode;

  getByRefId(id: string): FormNode | undefined {
    throw new Error("Method not implemented.");
  }

  addChild(parent: FormNode, control: ControlDefinition): FormNode {
    return (parent as EditorFormNode).addChild(control);
  }
  getForm(formId: string): FormTree | undefined {
    throw new Error("Method not implemented.");
  }
  constructor(public root: Control<ControlDefinition>) {
    super();
    this.rootNode = new EditorFormNode(this, undefined, root);
  }
}
