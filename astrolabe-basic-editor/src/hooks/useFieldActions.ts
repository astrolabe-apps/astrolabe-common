import { useCallback } from "react";
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
} from "@react-typed-forms/schemas";
import { BasicEditorState, BasicFieldType } from "../types";
import {
  generateFieldName,
  getFieldTypeConfig,
} from "../fieldTypes";

export function useFieldActions(state: Control<BasicEditorState>) {
  const addField = useCallback(
    (type: BasicFieldType) => {
      const { formTree, schemaTree, formFields, selectedField } =
        state.value;
      if (!formTree || !schemaTree || !formFields) return;

      const config = getFieldTypeConfig(type);
      const existingFields = [
        ...(state.fields.schemaFields.value?.value ?? []),
        ...(formFields.value ?? []),
      ];
      const fieldName = generateFieldName(existingFields);
      const controlDef = config.createControl(fieldName);
      const schemaField = config.createSchemaField(fieldName);

      groupedChanges(() => {
        if (schemaField) {
          addElement(formFields, schemaField);
        }

        const newNode = formTree.addNode(formTree.rootNode, controlDef, selectedField, true);
        state.fields.selectedField.value = newNode;
      });
    },
    [state],
  );

  const deleteField = useCallback(
    () => {
      const { formTree, formFields, selectedField } = state.value;
      if (!formTree || !formFields || !selectedField) return;

      const parentNode = selectedField.parent;
      if (!parentNode) return;

      const def = selectedField.definition;
      const defControl = formTree.getEditableDefinition(selectedField);
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

        state.fields.selectedField.value = undefined;
      });
    },
    [state],
  );

  const selectField = useCallback(
    (node: FormNode | undefined) => {
      state.fields.selectedField.value = node;
    },
    [state],
  );

  const moveField = useCallback(
    (sourceNodeId: string, targetContainerId: string, targetIndex: number) => {
      const { formTree } = state.value;
      if (!formTree) return;

      const found = formTree.findNodeWithParent(sourceNodeId);
      if (!found) return;
      const { parent: sourceParent, indexInParent: sourceIndex } = found;

      // Find target container node
      const targetContainer =
        targetContainerId === formTree.rootNode.id
          ? formTree.rootNode
          : formTree.rootNode.visit((x) =>
              x.id === targetContainerId ? x : undefined,
            );
      if (!targetContainer) return;

      const sourceChildren = formTree.getEditableChildren(sourceParent);
      const targetChildren = formTree.getEditableChildren(targetContainer);
      if (!sourceChildren || !targetChildren) return;

      const draggedControl = sourceChildren.elements[sourceIndex];

      groupedChanges(() => {
        if (sourceParent.id === targetContainer.id) {
          // Same container: reorder
          updateElements(sourceChildren, (childList) => {
            const result = childList.filter((x) => x !== draggedControl);
            const adjustedIndex =
              targetIndex > sourceIndex ? targetIndex - 1 : targetIndex;
            result.splice(adjustedIndex, 0, draggedControl);
            return result;
          });
        } else {
          // Cross-container: use updateElements to move the actual element
          // control rather than setting .value (which triggers updateFromValue
          // and can overwrite nested children).
          updateElements(sourceChildren, (childList) =>
            childList.filter((x) => x !== draggedControl),
          );
          updateElements(targetChildren, (childList) => {
            const result = [...childList];
            result.splice(targetIndex, 0, draggedControl);
            return result;
          });
        }
      });

    },
    [state],
  );

  return { addField, deleteField, selectField, moveField };
}

