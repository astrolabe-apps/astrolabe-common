import { Control, ensureMetaValue, groupedChanges, newControl, useComputed, useControl, useControlEffect, useDebounced } from "@react-typed-forms/core";
import { ControlDefinition, SchemaField } from "@react-typed-forms/schemas";
import { EditableForm } from "../types";
import { useRef, useEffect } from 'react';

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
  /** Shared across all hook instances */
  isRestoring: boolean;
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

  const snapshot = {
    formTreeValue: rootDefs.value,
    configValue: editableForm.fields.config.value,
    formSchemaValue: editableForm.fields.formSchema.value,
    timestamp: Date.now(),
  };

  console.debug('[Undo/Redo] Captured snapshot:', {
    timestamp: snapshot.timestamp,
    formTreeLength: snapshot.formTreeValue.length,
    configKeys: Object.keys(snapshot.configValue || {}),
    formSchemaLength: snapshot.formSchemaValue.length,
  });

  return snapshot;
}

/**
 * Restores a snapshot to the EditableForm
 * Only restores .value, NOT .initialValue, to preserve dirty state
 */
function restoreSnapshot(
  editableForm: Control<EditableForm>,
  snapshot: FormSnapshot
): void {
  console.debug('[Undo/Redo] Restoring snapshot:', {
    timestamp: snapshot.timestamp,
    formTreeLength: snapshot.formTreeValue.length,
    configKeys: Object.keys(snapshot.configValue || {}),
    formSchemaLength: snapshot.formSchemaValue.length,
  });

  groupedChanges(() => {
    const formTree = editableForm.fields.formTree.value;
    const rootDefs = formTree.getRootDefinitions();

    // Restore ONLY the value, NOT initialValue
    // This preserves dirty state naturally
    rootDefs.value = snapshot.formTreeValue;
    editableForm.fields.config.value = snapshot.configValue;
    editableForm.fields.formSchema.value = snapshot.formSchemaValue;
  });

  console.debug('[Undo/Redo] Snapshot restored successfully');
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
  console.debug('[Undo/Redo] Hook initialized');

  // CRITICAL: Store undo/redo state IN the editableForm itself as a Control
  // FormView can be unmounted when tab is not visible
  // State must persist across mount/unmount cycles
  const undoRedoStateControl = ensureMetaValue(
    editableForm,
    "undoRedoState",
    () => {
      console.debug('[Undo/Redo] Creating new undo/redo state control');
      return newControl<UndoRedoState>({
        past: [],
        present: captureSnapshot(editableForm),
        future: [],
        isRestoring: false,
      });
    }
  );

  console.debug('[Undo/Redo] Current state:', {
    pastLength: undoRedoStateControl.value.past.length,
    presentTimestamp: undoRedoStateControl.value.present.timestamp,
    futureLength: undoRedoStateControl.value.future.length,
  });

  // Timeout ref for cleanup
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Debounced snapshot capture
  const debouncedCapture = useDebounced(() => {
    const state = undoRedoStateControl.value;
    console.debug('[Undo/Redo] Debounced capture triggered', {
      isRestoring: state.isRestoring,
    });

    if (state.isRestoring) {
      console.debug('[Undo/Redo] Change detected during restore - clearing redo stack');
      // Clear redo stack immediately, but don't capture yet
      undoRedoStateControl.value = {
        ...state,
        future: [],  // Clear redo stack
        isRestoring: state.isRestoring,
      };
      return; // Still skip the capture
    }

    const snapshot = captureSnapshot(editableForm);

    const newPast = [...state.past, state.present];

    // Enforce max stack size (FIFO)
    if (newPast.length > UNDO_REDO_MAX_STACK_SIZE) {
      newPast.shift(); // Remove oldest
      console.debug('[Undo/Redo] Removed oldest snapshot to enforce max stack size');
    }

    console.debug('[Undo/Redo] Updating undo/redo state:', {
      pastLength: newPast.length,
      presentTimestamp: snapshot.timestamp,
      futureLength: 0, // Always cleared on new change
      clearingFutureStack: state.future.length > 0,
    });

    undoRedoStateControl.value = {
      past: newPast,
      present: snapshot,
      future: [], // Clear redo stack on new change
      isRestoring: state.isRestoring, // Preserve isRestoring flag
    };

    console.debug('[Undo/Redo] State updated - redo stack cleared due to new change');
  }, UNDO_REDO_DEBOUNCE_MS);

  // Watch for changes to any of the three data sources
  useControlEffect(
    () => {
      const data = {
        tree: editableForm.fields.formTree.value.getRootDefinitions().value,
        config: editableForm.fields.config.value,
        schema: editableForm.fields.formSchema.value,
      };
      console.debug('[Undo/Redo] Change detected:', {
        treeLength: data.tree.length,
        configKeys: Object.keys(data.config || {}),
        schemaLength: data.schema.length,
      });
      return data;
    },
    debouncedCapture
  );

  // Undo operation
  const undo = () => {
    const state = undoRedoStateControl.value;

    console.debug('[Undo/Redo] Undo called:', {
      pastLength: state.past.length,
      presentTimestamp: state.present.timestamp,
      futureLength: state.future.length,
    });

    if (state.past.length === 0) {
      console.debug('[Undo/Redo] Cannot undo - no past states');
      return;
    }

    // Set isRestoring flag in shared state
    undoRedoStateControl.value = {
      ...state,
      isRestoring: true,
    };
    console.debug('[Undo/Redo] Set isRestoring to true');

    const previous = state.past[state.past.length - 1];
    const newPast = state.past.slice(0, -1);

    console.debug('[Undo/Redo] Moving to previous state:', {
      previousTimestamp: previous.timestamp,
      newPastLength: newPast.length,
      addingToFuture: state.present.timestamp,
      newFutureLength: state.future.length + 1,
    });

    undoRedoStateControl.value = {
      past: newPast,
      present: previous,
      future: [state.present, ...state.future],
      isRestoring: true, // Keep flag true during restoration
    };

    console.debug('[Undo/Redo] State updated, restoring snapshot');
    restoreSnapshot(editableForm, previous);

    // Clear previous timeout if exists
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    // Use setTimeout with delay > debounce time to prevent capturing during undo
    // The debounce is 300ms, so we need to wait at least that long plus a buffer
    timeoutRef.current = setTimeout(() => {
      const currentState = undoRedoStateControl.value;
      undoRedoStateControl.value = {
        ...currentState,
        isRestoring: false,
      };
      console.debug('[Undo/Redo] Set isRestoring to false (after timeout)');
    }, UNDO_REDO_DEBOUNCE_MS + 50);
  };

  // Redo operation
  const redo = () => {
    const state = undoRedoStateControl.value;

    console.debug('[Undo/Redo] Redo called:', {
      pastLength: state.past.length,
      presentTimestamp: state.present.timestamp,
      futureLength: state.future.length,
      futureTimestamps: state.future.map(s => s.timestamp),
    });

    if (state.future.length === 0) {
      console.debug('[Undo/Redo] Cannot redo - no future states');
      return;
    }

    // Set isRestoring flag in shared state
    undoRedoStateControl.value = {
      ...state,
      isRestoring: true,
    };
    console.debug('[Undo/Redo] Set isRestoring to true');

    const next = state.future[0];
    const newFuture = state.future.slice(1);

    console.debug('[Undo/Redo] Moving to next state:', {
      nextTimestamp: next.timestamp,
      addingToPast: state.present.timestamp,
      newPastLength: state.past.length + 1,
      newFutureLength: newFuture.length,
    });

    undoRedoStateControl.value = {
      past: [...state.past, state.present],
      present: next,
      future: newFuture,
      isRestoring: true, // Keep flag true during restoration
    };

    console.debug('[Undo/Redo] State updated, restoring snapshot');
    restoreSnapshot(editableForm, next);

    // Clear previous timeout if exists
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    // Use setTimeout with delay > debounce time to prevent capturing during redo
    // The debounce is 300ms, so we need to wait at least that long plus a buffer
    timeoutRef.current = setTimeout(() => {
      const currentState = undoRedoStateControl.value;
      undoRedoStateControl.value = {
        ...currentState,
        isRestoring: false,
      };
      console.debug('[Undo/Redo] Set isRestoring to false (after timeout)');
    }, UNDO_REDO_DEBOUNCE_MS + 50);
  };

  // Reactive computed values for button state
  const canUndo = useComputed(() => {
    const canUndoValue = undoRedoStateControl.value.past.length > 0;
    console.debug('[Undo/Redo] canUndo computed:', {
      canUndo: canUndoValue,
      pastLength: undoRedoStateControl.value.past.length,
    });
    return canUndoValue;
  });

  const canRedo = useComputed(() => {
    const canRedoValue = undoRedoStateControl.value.future.length > 0;
    return canRedoValue;
  });

  return {
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
