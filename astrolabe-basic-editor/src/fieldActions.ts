import {
  addElement,
  Control,
  groupedChanges,
  removeElement,
  updateElements,
} from "@react-typed-forms/core";
import {
  ControlDefinition,
  FormNode,
  isDataControl,
  isGroupControl,
  SchemaField,
} from "@react-typed-forms/schemas";
import { BasicFieldType } from "./types";
import { generateFieldName, getFieldTypeConfig, toCamelCase } from "./fieldTypes";
import { EditorFormTree } from "./EditorFormTree";

export function addFieldToForm(
  formTree: EditorFormTree,
  schemaFields: Control<SchemaField[]>,
  selectedField: Control<FormNode | undefined>,
  type: BasicFieldType,
  pageMode?: boolean,
) {
  const config = getFieldTypeConfig(type);
  const existingFields = schemaFields.value ?? [];
  const fieldName = generateFieldName(existingFields);
  const controlDef = config.createControl(fieldName);
  const schemaField = config.createSchemaField(fieldName);

  // Determine parent and afterNode based on selection context
  let parent: FormNode;
  let afterNode: FormNode | undefined;

  const selected = selectedField.value;

  if (type === BasicFieldType.Page) {
    // Pages always go at root level, at the end
    parent = formTree.rootNode;
    afterNode = undefined;
  } else if (!selected) {
    // No selection: add to root at end
    parent = formTree.rootNode;
    afterNode = undefined;
  } else if (isGroupControl(selected.definition)) {
    // Selected is a group: add inside it at the end
    parent = selected;
    afterNode = undefined;
  } else {
    // Selected is a regular field: add after it in same parent
    const found = formTree.findNodeWithParent(selected.id);
    if (found) {
      parent = found.parent;
      afterNode = selected;
    } else {
      parent = formTree.rootNode;
      afterNode = undefined;
    }
  }

  groupedChanges(() => {
    if (schemaField) {
      addElement(schemaFields, schemaField);
    }
    const newNode = formTree.addNode(parent, controlDef, afterNode, true);
    selectedField.value = newNode;
  });
}

function collectFieldNames(def: ControlDefinition): string[] {
  const names: string[] = [];
  if (isDataControl(def)) {
    names.push(def.field);
  }
  if (def.children) {
    for (const child of def.children) {
      names.push(...collectFieldNames(child));
    }
  }
  return names;
}

export function deleteFieldFromForm(
  formTree: EditorFormTree,
  schemaFields: Control<SchemaField[]>,
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
    const fieldNames = collectFieldNames(def);
    for (const fieldName of fieldNames) {
      const fieldEl = schemaFields.elements.find(
        (el) => el.value.field === fieldName,
      );
      if (fieldEl) {
        removeElement(schemaFields, fieldEl);
      }
    }

    const parentChildren = formTree.getEditableChildren(parentNode);
    if (parentChildren) {
      removeElement(parentChildren, defControl);
    }

    selectedField.value = undefined;
  });
}

export function renameFieldInForm(
  schemaFields: Control<SchemaField[]>,
  fieldControl: Control<string>,
  title: string,
) {
  const newBase = toCamelCase(title);
  if (!newBase) return;

  const oldName = fieldControl.value;
  if (newBase === oldName) return;

  const existingNames = new Set(
    schemaFields.value.map((f) => f.field).filter((n) => n !== oldName),
  );

  let newName = newBase;
  let counter = 2;
  while (existingNames.has(newName)) {
    newName = newBase + counter;
    counter++;
  }

  const schemaFieldEl = schemaFields.elements.find(
    (el) => el.value.field === oldName,
  );

  groupedChanges(() => {
    fieldControl.value = newName;
    if (schemaFieldEl) {
      schemaFieldEl.fields.field.value = newName;
      schemaFieldEl.fields.displayName.value = newName;
    }
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
