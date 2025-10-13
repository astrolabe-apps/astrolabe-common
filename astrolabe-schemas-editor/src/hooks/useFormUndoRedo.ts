import {
  Control,
  ensureMetaValue,
  groupedChanges,
  newControl,
  useComputed,
  useControl,
  useControlEffect,
  useDebounced,
} from "@react-typed-forms/core";
import { ControlDefinition, SchemaField } from "@react-typed-forms/schemas";
import { EditableForm } from "../types";

// Constants
const UNDO_REDO_DEBOUNCE_MS = 300;
const UNDO_REDO_MAX_STACK_SIZE = 50;

// Snapshot types
interface FormSnapshot {
  formTreeValue: ControlDefinition[];
  configValue: any;
  formSchemaValue: SchemaField[];
  timestamp: number;
}

interface UndoRedoState {
  past: FormSnapshot[];
  present: FormSnapshot;
  future: FormSnapshot[];
}

// Hook return type
export interface UseFormUndoRedoReturn {
  undo: () => void;
  redo: () => void;
  canUndo: Control<boolean>;
  canRedo: Control<boolean>;
}

/**
 * Captures an immutable snapshot of the current EditableForm state
 */
function captureSnapshot(editableForm: Control<EditableForm>): FormSnapshot {
  const formTree = editableForm.fields.formTree.value;
  const rootDefs = formTree.getRootDefinitions();

  return {
    formTreeValue: rootDefs.value,
    configValue: editableForm.fields.config.value,
    formSchemaValue: editableForm.fields.formSchema.value,
    timestamp: Date.now(),
  };
}

/**
 * Restores a snapshot to the EditableForm
 * Only restores .value, NOT .initialValue, to preserve dirty state
 */
function restoreSnapshot(
  editableForm: Control<EditableForm>,
  snapshot: FormSnapshot
): void {
  groupedChanges(() => {
    const formTree = editableForm.fields.formTree.value;
    const rootDefs = formTree.getRootDefinitions();

    // Restore ONLY the value, NOT initialValue
    // This preserves dirty state naturally
    rootDefs.value = snapshot.formTreeValue;
    editableForm.fields.config.value = snapshot.configValue;
    editableForm.fields.formSchema.value = snapshot.formSchemaValue;
  });
}

/**
 * Provides undo/redo functionality for form editing
 *
 * State is persisted in the EditableForm control's metadata to survive
 * component unmount/remount cycles (e.g., when switching tabs).
 *
 * @param editableForm - The EditableForm control to track
 * @returns Undo/redo functions and reactive state flags
 */
export function useFormUndoRedo(
  editableForm: Control<EditableForm>
): UseFormUndoRedoReturn {
  // CRITICAL: Store undo/redo state IN the editableForm itself as a Control
  // FormView can be unmounted when tab is not visible
  // State must persist across mount/unmount cycles
  const undoRedoStateControl = ensureMetaValue(
    editableForm,
    "undoRedoState",
    () =>
      newControl<UndoRedoState>({
        past: [],
        present: captureSnapshot(editableForm),
        future: [],
      })
  );

  // Flag to prevent capturing during undo/redo operations
  // This can be component-local since it's only active during restoration
  const isRestoring = useControl(false);

  // Debounced snapshot capture
  const debouncedCapture = useDebounced(() => {
    if (isRestoring.value) return; // Don't capture during restoration

    const snapshot = captureSnapshot(editableForm);
    const state = undoRedoStateControl.value;

    const newPast = [...state.past, state.present];

    // Enforce max stack size (FIFO)
    if (newPast.length > UNDO_REDO_MAX_STACK_SIZE) {
      newPast.shift(); // Remove oldest
    }

    undoRedoStateControl.value = {
      past: newPast,
      present: snapshot,
      future: [], // Clear redo stack on new change
    };
  }, UNDO_REDO_DEBOUNCE_MS);

  // Watch for changes to any of the three data sources
  useControlEffect(
    () => ({
      tree: editableForm.fields.formTree.value.getRootDefinitions().value,
      config: editableForm.fields.config.value,
      schema: editableForm.fields.formSchema.value,
    }),
    debouncedCapture
  );

  // Undo operation
  const undo = () => {
    const state = undoRedoStateControl.value;
    if (state.past.length === 0) return;

    isRestoring.value = true;

    try {
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);

      undoRedoStateControl.value = {
        past: newPast,
        present: previous,
        future: [state.present, ...state.future],
      };

      restoreSnapshot(editableForm, previous);
    } finally {
      // Use setTimeout to ensure restoration completes before re-enabling
      setTimeout(() => {
        isRestoring.value = false;
      }, 0);
    }
  };

  // Redo operation
  const redo = () => {
    const state = undoRedoStateControl.value;
    if (state.future.length === 0) return;

    isRestoring.value = true;

    try {
      const next = state.future[0];
      const newFuture = state.future.slice(1);

      undoRedoStateControl.value = {
        past: [...state.past, state.present],
        present: next,
        future: newFuture,
      };

      restoreSnapshot(editableForm, next);
    } finally {
      setTimeout(() => {
        isRestoring.value = false;
      }, 0);
    }
  };

  // Reactive computed values for button state
  const canUndo = useComputed(() => undoRedoStateControl.value.past.length > 0);
  const canRedo = useComputed(
    () => undoRedoStateControl.value.future.length > 0
  );

  return {
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
