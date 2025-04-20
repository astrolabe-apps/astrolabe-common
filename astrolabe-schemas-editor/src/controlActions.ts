import { ControlDefinition, FormNode } from "@react-typed-forms/schemas";
import { EditorFormTree } from "./EditorFormTree";
import { addElement, groupedChanges } from "@react-typed-forms/core";
import { getClipboardControls } from "./clipboard";

export async function paste(
  tree: EditorFormTree,
  parent?: FormNode,
  child?: FormNode,
  after: boolean = false,
) {
  const controlData = await getClipboardControls();
  if (controlData) {
    const parentChildren = parent
      ? tree.getEditableChildren(parent)
      : tree.getRootDefinitions();
    let insertAt = child ? tree.getEditableDefinition(child) : undefined;
    if (parentChildren) {
      groupedChanges(() => {
        controlData.forEach((c) => {
          insertAt = addElement(parentChildren, c, insertAt, after);
          after = true;
        });
      });
    }
  }
}
