import { useCallback } from "react";
import {
  addElement,
  Control,
  groupedChanges,
  removeElement,
} from "@react-typed-forms/core";
import {
  ControlDefinition,
  FormNode,
  isDataControl,
  isGroupControl,
  SchemaField,
} from "@react-typed-forms/schemas";
import { BasicEditorState, BasicFieldType } from "../types";
import {
  generateFieldName,
  getFieldTypeConfig,
} from "../fieldTypes";
import { EditorFormTree } from "../EditorFormTree";

export function useFieldActions(state: Control<BasicEditorState>) {
  const addField = useCallback(
    (type: BasicFieldType) => {
      const { formTree, schemaTree, formFields, selectedFieldId } =
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

        const rootDefs = formTree.getRootDefinitions();
        const insertIndex = findInsertIndex(
          formTree,
          rootDefs,
          selectedFieldId,
        );

        if (insertIndex !== null) {
          insertAt(rootDefs, insertIndex, controlDef);
        } else {
          addElement(rootDefs, controlDef);
        }

        const newNode = formTree.rootNode.visit((x) => {
          if (isDataControl(x.definition) && x.definition.field === fieldName)
            return x;
          if (
            isGroupControl(x.definition) &&
            x.definition.title === controlDef.title &&
            x.definition === controlDef
          )
            return x;
          return undefined;
        });
        if (newNode) {
          state.fields.selectedFieldId.value = newNode.id;
        }
      });
    },
    [state],
  );

  const deleteField = useCallback(
    (fieldId: string) => {
      const { formTree, formFields, schemaFields } = state.value;
      if (!formTree || !formFields) return;

      const formNode = formTree.rootNode.visit((x) =>
        x.id === fieldId ? x : undefined,
      );
      if (!formNode) return;

      const def = formNode.definition;
      const defControl = formTree.getEditableDefinition(formNode);
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

        // Find parent and remove
        const parentNode = formTree.rootNode.visit((x) => {
          const children = x.definition.children;
          if (children && children.some((c) => c === def)) return x;
          return undefined;
        });
        if (parentNode) {
          const parentChildren = formTree.getEditableChildren(parentNode);
          if (parentChildren) {
            removeElement(parentChildren, defControl);
          }
        }

        state.fields.selectedFieldId.value = undefined;
      });
    },
    [state],
  );

  const selectField = useCallback(
    (fieldId: string | undefined) => {
      state.fields.selectedFieldId.value = fieldId;
    },
    [state],
  );

  const moveField = useCallback(
    (sourceNodeId: string, targetContainerId: string, targetIndex: number) => {
      const { formTree } = state.value;
      if (!formTree) return;

      // Find source node's parent and index within that parent.
      // We capture the index during traversal because FormNode.definition
      // is a trackedValue Proxy, so === comparison with raw array values fails.
      let sourceParent: FormNode | undefined;
      let sourceIndex = -1;
      formTree.rootNode.visit((x) => {
        const children = x.getUnresolvedChildNodes();
        for (let i = 0; i < children.length; i++) {
          if (children[i].id === sourceNodeId) {
            sourceParent = x;
            sourceIndex = i;
            return true;
          }
        }
        return undefined;
      });
      if (!sourceParent || sourceIndex < 0) return;

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

      groupedChanges(() => {
        if (sourceParent!.id === targetContainer.id) {
          // Same container: reorder
          const items = [...sourceChildren.value!];
          const [item] = items.splice(sourceIndex, 1);
          const adjustedIndex =
            targetIndex > sourceIndex ? targetIndex - 1 : targetIndex;
          items.splice(adjustedIndex, 0, item);
          sourceChildren.value = items;
        } else {
          // Cross-container: remove from source, insert into target
          const sourceItems = [...sourceChildren.value!];
          const [item] = sourceItems.splice(sourceIndex, 1);
          sourceChildren.value = sourceItems;
          const targetItems = [...targetChildren.value!];
          targetItems.splice(targetIndex, 0, item);
          targetChildren.value = targetItems;
        }
      });

    },
    [state],
  );

  return { addField, deleteField, selectField, moveField };
}

function findInsertIndex(
  formTree: EditorFormTree,
  rootDefs: Control<ControlDefinition[]>,
  selectedFieldId: string | undefined,
): number | null {
  if (!selectedFieldId) return null;
  const elements = rootDefs.elements;
  for (let i = 0; i < elements.length; i++) {
    const node = formTree.rootNode.getChildNodes()[i];
    if (node && node.id === selectedFieldId) {
      return i + 1;
    }
  }
  return null;
}

function insertAt<T>(
  control: Control<T[]>,
  index: number,
  item: T,
) {
  control.setValue((arr) => {
    const next = [...arr];
    next.splice(index, 0, item);
    return next;
  });
}
