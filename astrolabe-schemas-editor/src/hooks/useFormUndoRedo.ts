import {
  Control,
  ensureMetaValue,
  groupedChanges,
  newControl,
  useComputed,
  useControlEffect,
} from "@react-typed-forms/core";
import { ControlDefinition, SchemaField } from "@react-typed-forms/schemas";
import { EditableForm } from "../types";
import { useRef, useEffect } from "react";

// Constants
const UNDO_REDO_DEBOUNCE_MS = 2000;
const UNDO_REDO_MAX_STACK_SIZE = 100;

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
  /** Timestamp of when the last capture occurred */
  lastCaptureTimestamp: number;
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
  snapshot: FormSnapshot,
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
  editableForm: Control<EditableForm>,
): UseFormUndoRedoReturn {
  // CRITICAL: Store undo/redo state IN the editableForm itself as a Control
  // FormView can be unmounted when tab is not visible
  // State must persist across mount/unmount cycles
  const undoRedoStateControl = ensureMetaValue(
    editableForm,
    "undoRedoState",
    () => {
      return newControl<UndoRedoState>({
        past: [],
        present: captureSnapshot(editableForm),
        future: [],
        isRestoring: false,
        lastCaptureTimestamp: Date.now(),
      });
    },
  );

  // Timeout ref for cleanup
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Immediate snapshot capture with smart merging
  // Changes within UNDO_REDO_DEBOUNCE_MS merge into current snapshot
  // Changes after that period create a new undo point
  useControlEffect(
    () => ({
      tree: editableForm.fields.formTree.value.getRootDefinitions().value,
      config: editableForm.fields.config.value,
      schema: editableForm.fields.formSchema.value,
    }),
    () => {
      const state = undoRedoStateControl.value;

      if (state.isRestoring) {
        // A change was detected while a snapshot was being restored.
        // This is expected, as `restoreSnapshot` modifies the form.
        // We must ignore this change to prevent the redo stack from being cleared.
        return;
      }

      const now = Date.now();
      const timeSinceLastCapture = now - state.lastCaptureTimestamp;
      const snapshot = captureSnapshot(editableForm);

      // Decide whether to merge with current snapshot or create new undo point
      if (timeSinceLastCapture <= UNDO_REDO_DEBOUNCE_MS) {
        // Within debounce period - merge by updating present snapshot only
        // This makes undo immediately available and merges rapid changes
        undoRedoStateControl.value = {
          ...state,
          present: snapshot,
          future: [], // Clear redo stack on any change
          lastCaptureTimestamp: now,
        };
      } else {
        // Outside debounce period - create new undo point
        const newPast = [...state.past, state.present];

        // Enforce max stack size (FIFO)
        if (newPast.length > UNDO_REDO_MAX_STACK_SIZE) {
          newPast.shift(); // Remove oldest
        }

        undoRedoStateControl.value = {
          past: newPast,
          present: snapshot,
          future: [], // Clear redo stack on new change
          isRestoring: state.isRestoring,
          lastCaptureTimestamp: now,
        };
      }
    },
  );

  // Undo operation
  const undo = () => {
    const state = undoRedoStateControl.value;

    if (state.past.length === 0) {
      return;
    }

    // Set isRestoring flag in shared state
    undoRedoStateControl.value = {
      ...state,
      isRestoring: true,
    };

    const previous = state.past[state.past.length - 1];
    const newPast = state.past.slice(0, -1);

    undoRedoStateControl.value = {
      past: newPast,
      present: previous,
      future: [state.present, ...state.future],
      isRestoring: true, // Keep flag true during restoration
      lastCaptureTimestamp: Date.now(), // Reset timestamp so next change is fresh
    };

    restoreSnapshot(editableForm, previous);

    // Clear previous timeout if exists
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    // Use setTimeout to clear isRestoring flag after restoration completes
    timeoutRef.current = setTimeout(() => {
      const currentState = undoRedoStateControl.value;
      undoRedoStateControl.value = {
        ...currentState,
        isRestoring: false,
      };
    }, UNDO_REDO_DEBOUNCE_MS + 50);
  };

  // Redo operation
  const redo = () => {
    const state = undoRedoStateControl.value;

    if (state.future.length === 0) {
      return;
    }

    // Set isRestoring flag in shared state
    undoRedoStateControl.value = {
      ...state,
      isRestoring: true,
    };

    const next = state.future[0];
    const newFuture = state.future.slice(1);

    undoRedoStateControl.value = {
      past: [...state.past, state.present],
      present: next,
      future: newFuture,
      isRestoring: true, // Keep flag true during restoration
      lastCaptureTimestamp: Date.now(), // Reset timestamp so next change is fresh
    };

    restoreSnapshot(editableForm, next);

    // Clear previous timeout if exists
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    // Use setTimeout to clear isRestoring flag after restoration completes
    timeoutRef.current = setTimeout(() => {
      const currentState = undoRedoStateControl.value;
      undoRedoStateControl.value = {
        ...currentState,
        isRestoring: false,
      };
    }, UNDO_REDO_DEBOUNCE_MS + 50);
  };

  // Reactive computed values for button state
  const canUndo = useComputed(() => undoRedoStateControl.value.past.length > 0);

  const canRedo = useComputed(
    () => undoRedoStateControl.value.future.length > 0,
  );

  return {
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
