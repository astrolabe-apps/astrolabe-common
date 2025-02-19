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
  get children(): FormNode[] {
    return this.control.fields.children.elements.map(
      (x) => new EditorFormNode(x.uniqueId.toString(), this.tree, this, x),
    );
  }

  get definition(): ControlDefinition {
    return trackedValue(this.control);
  }
}
