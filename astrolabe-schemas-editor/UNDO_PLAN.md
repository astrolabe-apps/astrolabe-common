# Undo/Redo Architecture Plan

## Executive Summary

Implement a composable undo/redo system for the form editor that tracks data-only `EditableForm` state snapshots (excluding UI state) with debounced capture, maintains per-form history stacks using immutable control values directly (no serialization needed).

---

## Core Architecture

### 1. State Management Model

The undo/redo system follows a **triple-stack architecture**:

```typescript
interface UndoRedoState {
  past: FormSnapshot[]; // Max 50 entries (FIFO when full)
  present: FormSnapshot; // Current state
  future: FormSnapshot[]; // Redo stack (cleared on new changes)
}
```

**Key Insight**: We store immutable snapshots of control `.value` properties directly. No serialization needed since control values are already immutable plain objects. Dirty state is preserved naturally by only restoring `.value` and leaving `.initialValue` unchanged.

### 2. Snapshot Strategy

#### What Gets Captured

For each `EditableForm`, we capture **data state only** (no UI state):

1. **Form Tree State**

   - `ControlDefinition[]` from `formTree.getRootDefinitions().value`
   - **Only current `.value`** - NOT `initialValue`
   - `initialValue` is set on load and only changes on save

2. **Config State**

   - `config.value` only
   - **NOT** `initialValue`

3. **Form Schema State**
   - `formSchema.value` - this is stored with the form and should be undoable

**Explicitly Excluded** (UI state):

- `selectedControlId`
- `hideFields`, `showJson`, `showConfig`
- Any other ephemeral UI toggles

#### Snapshot Structure (No Serialization Needed!)

```typescript
interface FormSnapshot {
  formTreeValue: ControlDefinition[]; // Direct immutable value
  configValue: any; // Direct immutable value
  formSchemaValue: SchemaField[]; // Direct immutable value
  timestamp: number; // For debugging/analytics
}
```

**Critical Insight**: Control values are **immutable**. We can store them directly without serialization or deep cloning!

```typescript
function captureSnapshot(editableForm: Control<EditableForm>): FormSnapshot {
  const formTree = editableForm.fields.formTree.value;
  const rootDefs = formTree.getRootDefinitions();

  return {
    formTreeValue: rootDefs.value, // Already immutable!
    configValue: editableForm.fields.config.value, // Already immutable!
    formSchemaValue: editableForm.fields.formSchema.value, // Already immutable!
    timestamp: Date.now(),
  };
}
```

**Why No Serialization?**

- Control values are immutable by design in `@astrolabe-controls`
- Setting a control's value creates new references
- We can safely store and restore these references
- No need for `cleanDataForSchema()`, `JSON.parse(JSON.stringify())`, or `structuredClone()`

#### Snapshot Restoration

**The Critical Insight**: We only restore `.value`, NOT `.initialValue`. This naturally preserves dirty state!

```typescript
function restoreSnapshot(
  editableForm: Control<EditableForm>,
  snapshot: FormSnapshot
): void {
  groupedChanges(() => {
    const formTree = editableForm.fields.formTree.value;
    const rootDefs = formTree.getRootDefinitions();

    // Restore ONLY the value, NOT initialValue
    rootDefs.value = snapshot.formTreeValue;
    editableForm.fields.config.value = snapshot.configValue;
    editableForm.fields.formSchema.value = snapshot.formSchemaValue;
  });
}
```

**How Dirty State Is Preserved**:

1. `initialValue` is set when form loads and only changes on **save**
2. Dirty state = `value !== initialValue`
3. When we undo/redo:
   - We restore the `value` to a previous state
   - `initialValue` remains unchanged
   - If restored value equals initialValue → form is clean
   - If restored value differs from initialValue → form is dirty
4. **No special logic needed!** Dirty state is automatically correct.

**Example**:

```
1. Form loads: value = A, initialValue = A (clean)
2. User edits: value = B, initialValue = A (dirty)
3. User saves: value = B, initialValue = B (clean)
4. User edits: value = C, initialValue = B (dirty)
5. User undos: value = B, initialValue = B (clean ✓)
6. User undos: value = A, initialValue = B (dirty ✓)
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
  const debouncedCapture = useDebounced(() => {
    if (isRestoring.value) return; // Don't capture during restoration

    const snapshot = captureSnapshot(editableForm);

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
  useControlEffect(() => {
    // Track changes to the entire form tree control
    const formTree = editableForm.fields.formTree.value;
    const rootControl = formTree.control;

    // We need to trigger on any change to the root control
    // This will reactively track all child changes
    return rootControl.value;
  }, debouncedCapture);

  // Also watch config changes
  useControlEffect(() => editableForm.fields.config.value, debouncedCapture);

  // Also watch formSchema changes
  useControlEffect(
    () => editableForm.fields.formSchema.value,
    debouncedCapture
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

      restoreSnapshot(editableForm, previous);
    } finally {
      // Use setTimeout to ensure restoration completes before re-enabling
      setTimeout(() => {
        isRestoring.value = false;
      }, 0);
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

### Decision 3: No Serialization Required

**Key Architectural Decision**: Control values are immutable, so we store them directly.

**Why This Works**:

1. `@astrolabe-controls` uses immutable value semantics
2. Setting `control.value = newValue` creates new object references
3. Previous values remain unchanged in memory
4. We can safely store and restore these references
5. No deep cloning, serialization, or `cleanDataForSchema()` needed

**Memory Sharing**:

- Multiple snapshots may share unchanged subtrees
- JavaScript engine handles reference counting
- More memory efficient than deep cloning!

**Trade-off**: If control values were mutable, we'd need deep cloning. But they're not, so we don't!

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

### Decision 5: Triple Change Tracking

We track `formTree`, `config`, AND `formSchema` changes separately:

```typescript
useControlEffect(() => formTree.control.value, debouncedCapture);
useControlEffect(() => config.value, debouncedCapture);
useControlEffect(() => formSchema.value, debouncedCapture);
```

**Why separate watchers?**

- All three are independent controls
- User might edit any in isolation
- All should create undo points
- Debouncing coalesces rapid changes across any/all of them

**Why not combine into one watcher?**

```typescript
// DON'T DO THIS:
useControlEffect(
  () => ({
    tree: formTree.control.value,
    config: config.value,
    schema: formSchema.value,
  }),
  debouncedCapture
);
```

- Creates new object every render (unnecessary allocations)
- All three watchers call the same debounced function anyway
- Separate watchers are cleaner and more efficient

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

**Decision**: Start without flush, add if users report issues.

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
  present: captureSnapshot(editableForm), // Captures loaded state
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

**Decision**: FormSchema changes ARE undoable. FormSchema is stored with the form and is part of the form's data state, so it belongs in the undo/redo system.

---

## Performance Analysis

### Snapshot Capture Cost

**Operation**: Capture immutable references

- Read `.value` from three controls (formTree, config, formSchema)
- Create new snapshot object with these references
- No traversal, no serialization, no deep copying

**Estimated Cost**: O(1) - constant time!

- Just reading references and creating small object
- Estimated time: < 1ms

**Mitigated By**:

- 300ms debounce (amortizes cost)
- Runs in main thread but unlikely to cause jank

### Restoration Cost

**Operation**: Restore immutable references

- Set `.value` on three controls (formTree, config, formSchema)
- Propagates to all children through reactivity
- `groupedChanges()` batches updates

**Estimated Cost**: O(n) control updates

- Estimated time: 5-20ms

**Mitigated By**:

- User-initiated action (undo/redo)
- Acceptable latency for such operations

### Memory Footprint

**Per Snapshot**:

- Three immutable object references
- Tiny snapshot object (~100 bytes overhead)
- **Structural sharing**: Unchanged subtrees are shared between snapshots

**Total Memory**: Depends on actual changes, not snapshot count!

- If user edits one field: ~1KB additional per snapshot (changed path only)
- If user replaces entire form: ~100KB per snapshot
- Structural sharing makes this very efficient
- **Much better than expected** due to immutability!

**Why Optimization Isn't Needed**:

1. **Already optimal**: Immutability provides structural sharing for free
2. **No serialization cost**: O(1) snapshot capture
3. **Memory efficient**: Only changed paths consume additional memory

**Future Considerations** (unlikely to be needed):

1. **Weak references**: Could use WeakMap for very old snapshots
2. **Compression**: Only if forms become extremely large (>10MB)
3. **Differential encoding**: Immutability already provides this naturally

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

- `SchemaNode` - Type information (if needed for validation)

### Hook API Contract

```typescript
interface UseFormUndoRedoReturn {
  undo: () => void;
  redo: () => void;
  canUndo: Control<boolean>; // Reactive
  canRedo: Control<boolean>; // Reactive
}

export function useFormUndoRedo(
  editableForm: Control<EditableForm>
): UseFormUndoRedoReturn;
```

**Usage in FormView**:

```typescript
const { undo, redo, canUndo, canRedo } = useFormUndoRedo(c);
```

**Note**: No longer needs `controlDefinitionTree` parameter since we're not using `cleanDataForSchema()`!

---

## Testing Strategy

### Unit Tests (Future)

1. **Snapshot Capture/Restore**

   - Verify `captureSnapshot()` captures all state correctly
   - Verify `restoreSnapshot()` restores correctly
   - Test dirty state preservation (value vs initialValue)

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

## Resolved Decisions

1. **UI state**: NOT captured - data only (formTree, config, formSchema)

2. **FormSchema**: Included in undo/redo (stored with form)

3. **InitialValue**: NOT captured in snapshots - only set on load/save

4. **Serialization**: NOT needed - store immutable values directly

5. **Dirty state**: Automatically preserved by only restoring `.value`

6. **Debounce timing**: 300ms (hardcoded constant)

7. **Stack size**: 50 snapshots (hardcoded constant)

## Open Questions

1. **Should we implement "flush pending" logic** for undo during debounce window?

   - **Recommendation**: Start without it, add if users report issues

2. **setTimeout pattern**: Is `setTimeout(..., 0)` the right way to reset `isRestoring` flag?
   - Ensures restoration completes before re-enabling change tracking
   - Alternative: Could use Promise.resolve().then() for microtask timing
   - **Recommendation**: Start with setTimeout, profile if issues arise
