# Undo/Redo Architecture Plan

## Executive Summary

Implement a composable undo/redo system for the form editor that tracks complete `EditableForm` state snapshots with debounced capture, maintains per-form history stacks, and preserves dirty state semantics during restoration.

---

## Core Architecture

### 1. State Management Model

The undo/redo system follows a **triple-stack architecture**:

```typescript
interface UndoRedoState {
  past: SerializedFormSnapshot[]; // Max 50 entries (FIFO when full)
  present: SerializedFormSnapshot; // Current state
  future: SerializedFormSnapshot[]; // Redo stack (cleared on new changes)
}
```

**Key Insight**: We don't store the actual `Control` instances, but serialized snapshots that can reconstruct the exact state including dirty flags.

### 2. Snapshot Strategy

#### What Gets Captured

For each `EditableForm`, we need to capture:

1. **Form Tree State**

   - All `ControlDefinition[]` from `formTree.getRootDefinitions().value`
   - Both current `value` AND `initialValue` for dirty state preservation

2. **Config State**

   - `config.value` and `config.initialValue`

3. **Form Schema State**

   - `formSchema` array (though this might be read-only?)

4. **UI State** (debatable - may exclude these)
   - `selectedControlId` - probably should NOT be in undo/redo
   - `hideFields`, `showJson`, `showConfig` - probably should NOT be in undo/redo

**Decision Point**: Should we capture selectedControlId and UI toggles? Claude's recommendation is **NO** - only capture data state, not ephemeral UI state. @doolse to advise.

#### Serialization Approach

```typescript
interface SerializedFormSnapshot {
  formTreeData: {
    value: ControlDefinition[];
    initialValue: ControlDefinition[];
  };
  configData: {
    value: any;
    initialValue: any;
  };
  formSchemaData: SchemaField[];
  timestamp: number; // For debugging/analytics
}
```

**Critical Implementation Detail**: We use `cleanDataForSchema()` to serialize the form tree, which strips out Control metadata and returns plain objects suitable for JSON serialization.

```typescript
function serializeFormSnapshot(
  editableForm: Control<EditableForm>,
  controlDefinitionTree: SchemaNode
): SerializedFormSnapshot {
  const formTree = editableForm.fields.formTree.value;
  const rootDefs = formTree.getRootDefinitions();

  return {
    formTreeData: {
      value: rootDefs.value.map((c) =>
        cleanDataForSchema(c, controlDefinitionTree, true)
      ),
      initialValue: rootDefs.initialValue.map((c) =>
        cleanDataForSchema(c, controlDefinitionTree, true)
      ),
    },
    configData: {
      value: JSON.parse(JSON.stringify(editableForm.fields.config.value)),
      initialValue: JSON.parse(
        JSON.stringify(editableForm.fields.config.initialValue)
      ),
    },
    formSchemaData: JSON.parse(
      JSON.stringify(editableForm.fields.formSchema.value)
    ),
    timestamp: Date.now(),
  };
}
```

#### Deserialization & Restoration

**The Critical Challenge**: When restoring state, we need to preserve the exact dirty state. This means:

1. Setting both `value` AND `initialValue` atomically
2. Using `groupedChanges()` to batch all updates
3. Avoiding triggering the change listener that would create a new snapshot

```typescript
function restoreFormSnapshot(
  editableForm: Control<EditableForm>,
  snapshot: SerializedFormSnapshot,
  skipChangeTracking: boolean = true
): void {
  // CRITICAL: We need to temporarily disable change tracking
  // to avoid creating a new undo snapshot while restoring

  groupedChanges(() => {
    const formTree = editableForm.fields.formTree.value;
    const rootDefs = formTree.getRootDefinitions();

    // Restore form tree with both value and initialValue
    rootDefs.setValueAndInitial(
      snapshot.formTreeData.value,
      snapshot.formTreeData.initialValue
    );

    // Restore config with both value and initialValue
    editableForm.fields.config.setValueAndInitial(
      snapshot.configData.value,
      snapshot.configData.initialValue
    );

    // Restore form schema
    editableForm.fields.formSchema.value = snapshot.formSchemaData;
  });
}
```

### 3. Change Detection & Debouncing

#### The Reactivity Chain

```
User edits form
  ↓
Control.value changes
  ↓
useControlEffect detects change
  ↓
Debounced capture function scheduled (300ms)
  ↓
If no changes for 300ms: snapshot captured
  ↓
Snapshot pushed to 'past' stack
  ↓
'future' stack cleared
```

#### Implementation Pattern

```typescript
export function useFormUndoRedo(
  editableForm: Control<EditableForm>,
  controlDefinitionTree: SchemaNode
) {
  // State management using @astrolabe-controls
  const undoRedoState = useControl<UndoRedoState>(() => ({
    past: [],
    present: serializeFormSnapshot(editableForm, controlDefinitionTree),
    future: [],
  }));

  // Flag to prevent capturing during undo/redo operations
  const isRestoring = useControl(false);

  // Debounced snapshot capture
  const captureSnapshot = useDebounced((snapshot: SerializedFormSnapshot) => {
    if (isRestoring.value) return; // Don't capture during restoration

    undoRedoState.setValue((state) => {
      const newPast = [...state.past, state.present];

      // Enforce max stack size (FIFO)
      if (newPast.length > UNDO_REDO_MAX_STACK_SIZE) {
        newPast.shift(); // Remove oldest
      }

      return {
        past: newPast,
        present: snapshot,
        future: [], // Clear redo stack on new change
      };
    });
  }, UNDO_REDO_DEBOUNCE_MS);

  // Watch for changes to the form tree
  useControlEffect(
    () => {
      // Track changes to the entire form tree control
      const formTree = editableForm.fields.formTree.value;
      const rootControl = formTree.control;

      // We need to trigger on any change to the root control
      // This will reactively track all child changes
      return rootControl.value;
    },
    () => {
      const snapshot = serializeFormSnapshot(
        editableForm,
        controlDefinitionTree
      );
      captureSnapshot(snapshot);
    }
  );

  // Also watch config changes
  useControlEffect(
    () => editableForm.fields.config.value,
    () => {
      const snapshot = serializeFormSnapshot(
        editableForm,
        controlDefinitionTree
      );
      captureSnapshot(snapshot);
    }
  );

  // Undo/Redo operations
  const undo = () => {
    const state = undoRedoState.value;
    if (state.past.length === 0) return;

    isRestoring.value = true;

    try {
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);

      undoRedoState.value = {
        past: newPast,
        present: previous,
        future: [state.present, ...state.future],
      };

      restoreFormSnapshot(editableForm, previous);
    } finally {
      // Use setTimeout to ensure restoration completes before re-enabling
      setTimeout(() => {
        isRestoring.value = false;
      }, 0); // @doolse codesmell?
    }
  };

  const redo = () => {
    // Similar to undo, but for the future stack
  };

  const canUndo = useComputed(() => undoRedoState.value.past.length > 0);
  const canRedo = useComputed(() => undoRedoState.value.future.length > 0);

  return {
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
```

---

## Deep Dive: Critical Design Decisions

### Decision 1: Why Track the Root Control Value?

```typescript
useControlEffect(
  () => editableForm.fields.formTree.value.control.value
  // ...
);
```

**Rationale**: The `EditorFormTree` wraps a `Control<ControlDefinition>` in its `control` property. When ANY child control within the tree changes (adding elements, changing field values, etc.), the root control's value changes due to the reactive propagation in `@astrolabe-controls`.

**Alternative Considered**: Track `formTree.value.getRootDefinitions().value` instead.

- **Problem**: This only tracks changes to the root array reference, not deep changes within existing controls.

**Chosen Approach**: Track `formTree.value.control.value`

- This leverages the existing reactivity system
- Any child change bubbles up to the root control
- Automatically handles nested changes without manual deep watching

### Decision 2: Restoration Guard Pattern

The `isRestoring` flag is **critical** to prevent infinite loops:

```
undo() called
  ↓
restoreFormSnapshot() runs
  ↓
control.value changes
  ↓
useControlEffect triggers
  ↓
captureSnapshot() called
  ↓
Check isRestoring flag → TRUE
  ↓
Early return (no snapshot captured)
```

**Why `setTimeout(() => isRestoring.value = false, 0)`?**

- Ensures all synchronous control updates complete
- Moves flag reset to next event loop tick
- Prevents race conditions with debounced capture

### Decision 3: Serialization Depth

We use `cleanDataForSchema()` which:

1. Strips Control wrappers
2. Returns plain objects
3. Handles `trackedValue()` unwrapping
4. Preserves the actual data structure

**Why not just `JSON.parse(JSON.stringify())`?**

- Controls have circular references
- Need proper handling of undefined vs null
- Schema-aware cleaning ensures type safety

@doolse should we use structuredClone() instead of JSON.parse(JSON.stringify())? - structuredClone() handles more types (e.g., Dates, Maps).

### Decision 4: Stack Size Management

FIFO (First In, First Out) when exceeding 50 entries:

```typescript
if (newPast.length > UNDO_REDO_MAX_STACK_SIZE) {
  newPast.shift(); // Remove oldest
}
```

**Why FIFO vs LRU or other strategies?**

- Simpler implementation
- Predictable behavior for users
- Natural chronological ordering
- Most recent history is most valuable

**Memory Considerations**:

- Each snapshot is JSON-serializable
- Average form might be 50-500KB serialized
- 50 snapshots = 2.5-25MB worst case
- Acceptable for modern browsers

### Decision 5: Dual Change Tracking

We track both `formTree` changes AND `config` changes separately:

```typescript
useControlEffect(() => formTree.control.value, captureSnapshot);
useControlEffect(() => config.value, captureSnapshot);
```

**Why separate watchers?**

- Config and formTree are independent controls
- User might edit config while tree is unchanged
- Both should create undo points
- Debouncing coalesces rapid changes to either

**Potential Optimization**: Could combine into single watcher that tracks a computed composite:

```typescript
useControlEffect(
  () => ({
    tree: formTree.control.value,
    config: config.value,
  }),
  captureSnapshot
);
```

But this creates a new object every render. Current approach is cleaner.

---

## Edge Cases & Considerations

### Edge Case 1: Rapid Sequential Changes

**Scenario**: User types quickly, triggering many changes within 300ms.

**Behavior**:

- Debounce timer resets on each change
- Only final state after 300ms of inactivity is captured
- Expected and desired behavior

### Edge Case 2: Undo During Debounce Window

**Scenario**:

1. User makes change A
2. 200ms passes
3. User presses Ctrl+Z

**Behavior**:

- Change A hasn't been captured yet (still in debounce)
- Undo reverts to previous snapshot (before A)
- Change A is lost

**Solution**: Could implement "flush pending changes" on undo/redo:

```typescript
const undo = () => {
  // Force flush any pending debounced snapshot
  captureSnapshot.flush?.(); // If we add flush support to useDebounced
  // Then proceed with undo
};
```

**Decision**: @doolse to advise. Start without flush, add if users report issues.

### Edge Case 3: Form Loading

**Scenario**: Form loads from server, `setInitialValue()` called.

**Behavior**:

- Initial load sets both value and initialValue
- This triggers change detection
- First snapshot is captured after debounce

**Desired**: Initial state should be the first undo point.

**Solution**: The `useControl` initialization handles this:

```typescript
const undoRedoState = useControl<UndoRedoState>(() => ({
  past: [],
  present: serializeFormSnapshot(editableForm, controlDefinitionTree), // Captures loaded state
  future: [],
}));
```

Initial snapshot is set as `present` before any changes occur.

### Edge Case 4: Concurrent Form Instances

**Scenario**: Multiple forms open in tabs.

**Behavior**:

- Each `FormView` creates its own `useFormUndoRedo` instance
- Completely independent undo stacks
- No shared state

**Expected**: Works correctly due to per-instance state management.

### Edge Case 5: Schema Changes

**Scenario**: User changes schema, adding/removing fields.

**Question**: Should schema changes be undoable?

**Current Plan**: `formSchema` is captured in snapshots.

**Consideration**: Schema editing might be a separate undo context?

**Decision**: Keep it simple - include in main undo for now. Can split later if needed. @doolse to advise.

---

## Performance Analysis

### Snapshot Capture Cost

**Operation**: Serialize entire form tree

- `cleanDataForSchema()` traverses entire tree
- JSON serialization of result
- Deep copy of config

**Estimated Cost**: O(n) where n = number of controls

- Typical form: 50-200 controls
- Estimated time: 1-10ms

**Mitigated By**:

- 300ms debounce (amortizes cost)
- Runs in main thread but unlikely to cause jank

### Restoration Cost

**Operation**: Deserialize and apply to controls

- `setValueAndInitial()` on root control
- Propagates to all children
- `groupedChanges()` batches updates

**Estimated Cost**: O(n) control updates

- Estimated time: 5-20ms

**Mitigated By**:

- User-initiated action (undo/redo)
- Acceptable latency for such operations

### Memory Footprint

**Per Snapshot**:

- Serialized JSON string
- Retained in `past`/`future` arrays

**Total Memory**: 50 snapshots × ~100KB = ~5MB (typical)

**Optimization Opportunities** (future):

1. **Compression**: Use LZ-string or similar for snapshots
2. **Differential Snapshots**: Only store deltas after first snapshot
3. **Sparse Snapshots**: Only capture changed subtrees

**Decision**: Start with full snapshots. Optimize if memory becomes an issue.

---

## Integration Points

### Required Dependencies

From `@react-typed-forms/core`:

- `useControl` - State management
- `useControlEffect` - Change detection
- `useDebounced` - Debouncing
- `useComputed` - Derived state (canUndo/canRedo)
- `groupedChanges` - Batched updates
- `Control` type

From `@react-typed-forms/schemas`:

- `cleanDataForSchema` - Serialization
- `SchemaNode` - Type information

### Hook API Contract

```typescript
interface UseFormUndoRedoOptions {
  editableForm: Control<EditableForm>;
  controlDefinitionTree: SchemaNode;
}

interface UseFormUndoRedoReturn {
  undo: () => void;
  redo: () => void;
  canUndo: Control<boolean>; // Reactive
  canRedo: Control<boolean>; // Reactive
}

export function useFormUndoRedo(
  options: UseFormUndoRedoOptions
): UseFormUndoRedoReturn;
```

**Usage in FormView**:

```typescript
const { undo, redo, canUndo, canRedo } = useFormUndoRedo({
  editableForm: c,
  controlDefinitionTree: context.editorFields,
});
```

---

## Testing Strategy

### Unit Tests (Future)

1. **Snapshot Serialization**

   - Verify `serializeFormSnapshot()` captures all state
   - Verify `restoreFormSnapshot()` restores correctly
   - Test dirty state preservation

2. **Stack Operations**

   - Test undo/redo sequence
   - Test stack size limits
   - Test future stack clearing on new changes

3. **Edge Cases**
   - Undo with empty past
   - Redo with empty future
   - Rapid changes with debouncing

### Manual Testing Scenarios

1. **Basic Operations**

   - Make change → Undo → Verify restoration
   - Make change → Undo → Redo → Verify restoration

2. **Dirty State**

   - Load form (clean) → Make change (dirty) → Undo → Should be clean again
   - Make change → Save (clean) → Make change (dirty) → Undo → Should be clean

3. **Complex Changes**

   - Add multiple controls → Undo → All removed
   - Nested field changes → Undo → All reverted

4. **Stack Limits**
   - Make 60 changes → Undo 50 times → Verify stops at oldest retained state

---

## Future Enhancements

### Potential Improvements

1. **Persistent Undo History**

   - Save undo stack to localStorage
   - Restore on form reload
   - Needs careful handling of schema changes

2. **Undo/Redo Labels**

   - Capture description with each snapshot
   - Show in UI: "Undo: Add Button Control"
   - Requires change classification

3. **Branching History**

   - Multiple undo branches (like Git)
   - Visual history tree
   - Significantly more complex

4. **Selective Undo**

   - Undo specific controls without affecting others
   - Non-linear history
   - Very complex implementation

5. **Compression**
   - Implement snapshot compression
   - Differential snapshots
   - Memory optimization

---

## Open Questions for Review

1. **Should we capture UI state** (`selectedControlId`, `hideFields`, etc.) or only data state?

   - **Recommendation**: Data state only

2. **Should form schema changes be in the same undo context** as form tree changes?

   - **Recommendation**: Yes, for simplicity

3. **Debounce timing**: Is 300ms appropriate, or should it be configurable?

   - **Recommendation**: Start with 300ms constant

4. **Should we implement "flush pending" logic** for undo during debounce window?

   - **Recommendation**: Add if users report issues

5. **Memory limits**: Is 50 snapshots appropriate for all forms?

   - **Recommendation**: Start with 50, make configurable if needed

6. **Should undo/redo affect the tab's "dirty" indicator** (the asterisk in tab title)?
   - **Current plan**: No, dirty state is calculated from value vs initialValue
   - If we restore initialValue correctly, dirty state is preserved automatically
