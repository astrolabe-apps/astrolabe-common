import {
  addElement,
  Control,
  groupedChanges,
  removeElement,
  updateElements,
} from "@react-typed-forms/core";
import {
  FormNode,
  isDataControl,
  isGroupControl,
  SchemaField,
} from "@react-typed-forms/schemas";
import { BasicFieldType } from "./types";
import { generateFieldName, getFieldTypeConfig } from "./fieldTypes";
import { EditorFormTree } from "./EditorFormTree";

export function addFieldToForm(
  formTree: EditorFormTree,
  formFields: Control<SchemaField[]>,
  schemaFields: Control<SchemaField[]>,
  selectedField: Control<FormNode | undefined>,
  type: BasicFieldType,
) {
  const config = getFieldTypeConfig(type);
  const existingFields = [
    ...(schemaFields.value ?? []),
    ...(formFields.value ?? []),
  ];
  const fieldName = generateFieldName(existingFields);
  const controlDef = config.createControl(fieldName);
  const schemaField = config.createSchemaField(fieldName);

  groupedChanges(() => {
    if (schemaField) {
      addElement(formFields, schemaField);
    }
    const newNode = formTree.addNode(
      formTree.rootNode,
      controlDef,
      selectedField.value,
      true,
    );
    selectedField.value = newNode;
  });
}

export function deleteFieldFromForm(
  formTree: EditorFormTree,
  formFields: Control<SchemaField[]>,
  selectedField: Control<FormNode | undefined>,
) {
  const node = selectedField.value;
  if (!node) return;

  const parentNode = node.parent;
  if (!parentNode) return;

  const def = node.definition;
  const defControl = formTree.getEditableDefinition(node);
  if (!defControl) return;

  groupedChanges(() => {
    if (isDataControl(def)) {
      const fieldName = def.field;
      const fieldEl = formFields.elements.find(
        (el) => el.value.field === fieldName,
      );
      if (fieldEl) {
        removeElement(formFields, fieldEl);
      }
    }

    const parentChildren = formTree.getEditableChildren(parentNode);
    if (parentChildren) {
      removeElement(parentChildren, defControl);
    }

    selectedField.value = undefined;
  });
}

export function moveFieldInForm(
  formTree: EditorFormTree,
  sourceNode: FormNode,
  targetContainer: FormNode,
  insertBefore: FormNode | null,
  pageMode?: boolean,
) {
  if (pageMode && targetContainer.id === formTree.rootNode.id) {
    if (!isGroupControl(sourceNode.definition)) return;
  }

  const found = formTree.findNodeWithParent(sourceNode.id);
  if (!found) return;
  const { parent: sourceParent, indexInParent: sourceIndex } = found;

  const sourceChildren = formTree.getEditableChildren(sourceParent);
  const targetChildren = formTree.getEditableChildren(targetContainer);
  if (!sourceChildren || !targetChildren) return;

  const draggedControl = sourceChildren.elements[sourceIndex];
  const insertBeforeControl = insertBefore
    ? formTree.getEditableDefinition(insertBefore)
    : undefined;

  groupedChanges(() => {
    if (sourceParent.id === targetContainer.id) {
      updateElements(sourceChildren, (childList) => {
        const result = childList.filter((x) => x !== draggedControl);
        let idx = insertBeforeControl
          ? result.indexOf(insertBeforeControl)
          : result.length;
        if (idx < 0) idx = result.length;
        result.splice(idx, 0, draggedControl);
        return result;
      });
    } else {
      updateElements(sourceChildren, (childList) =>
        childList.filter((x) => x !== draggedControl),
      );
      updateElements(targetChildren, (childList) => {
        const result = [...childList];
        let idx = insertBeforeControl
          ? result.indexOf(insertBeforeControl)
          : result.length;
        if (idx < 0) idx = result.length;
        result.splice(idx, 0, draggedControl);
        return result;
      });
    }
  });
}
