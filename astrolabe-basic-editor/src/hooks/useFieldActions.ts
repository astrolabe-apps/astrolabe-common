import { useCallback } from "react";
import {
  addElement,
  Control,
  groupedChanges,
  removeElement,
} from "@react-typed-forms/core";
import {
  ControlDefinition,
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

  return { addField, deleteField, selectField };
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
