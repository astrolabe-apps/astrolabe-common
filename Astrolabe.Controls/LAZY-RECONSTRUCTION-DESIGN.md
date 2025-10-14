# Lazy Reconstruction Design for Control<T>

## Overview

This document describes the lazy reconstruction approach for synchronizing child control changes back to parent controls. Instead of eagerly reconstructing the parent value every time a child changes, we mark the parent as "dirty" and only reconstruct when the Value property is actually accessed.

## Key Benefits

1. **Batch optimization** - Multiple child changes only trigger one reconstruction when parent Value is finally accessed
2. **Avoids wasted work** - If parent value is never read between updates, reconstruction is skipped entirely
3. **Simpler update flow** - Children just mark parent as dirty without complex reconstruction logic
4. **Reduced cascade chains** - Prevents potential issues with parent reconstruction triggering observers during updates
5. **No mutability tracking needed** - Immutability is maintained through reconstruction, not cloning

## Design Principles

- **Immutability preserved** - Parent values are always reconstructed fresh from children, maintaining immutability
- **No stale state** - Values are immutable, so there's no stale window; just deferred reconstruction
- **Single-threaded** - No thread-safety concerns; external synchronization required for multi-threaded use
- **IsDirty triggers reconstruction** - Accessing IsDirty in GetChangeState ensures reactive dependencies see updates

## Implementation Changes

### 1. Flag Modifications

**Replace ValueMutable with ChildValueDirty flag:**

```csharp
[Flags]
public enum ControlFlags
{
    None = 0,
    Disabled = 1,
    Touched = 2,
    ChildValueDirty = 4,           // Was: ValueMutable
    // InitialValueMutable removed - not needed (InitialValue only flows top-down)
    ErrorsMutable = 16,             // Keep for now, can be removed later
    DontClearError = 32
}
```

**Note**: `InitialValueMutable` flag is removed because `InitialValue` only flows from parent to child, never child to parent. Children's initial values don't synchronize back up, so no reconstruction or dirty tracking is needed.

### 2. Value Property - Lazy Reconstruction

**Modify Value getter to reconstruct when dirty and normalize undefined:**

```csharp
public object? Value
{
    get
    {
        if ((_flags & ControlFlags.ChildValueDirty) != 0)
        {
            ReconstructValueFromChildren();
        }
        // Return null for undefined values instead of exposing internal sentinel
        return _value is UndefinedValue ? null : _value;
    }
}
```

**InitialValue remains simple but also normalizes undefined:**

```csharp
public object? InitialValue
{
    get
    {
        // No reconstruction needed - InitialValue only flows top-down
        // Return null for undefined values instead of exposing internal sentinel
        return _initialValue is UndefinedValue ? null : _initialValue;
    }
}
```

**Rationale**: External consumers shouldn't need to know about the internal `UndefinedValue` sentinel type. The `IsUndefined` property is still available to explicitly check for undefined state, but `Value` and `InitialValue` return the more natural `null` for undefined controls.

### 3. Reconstruction Method

**New method to reconstruct value from children:**

```csharp
private void ReconstructValueFromChildren()
{
    var childControls = new Dictionary<string, IControl>();

    // Collect field controls
    if (_fieldControls != null)
    {
        foreach (var (key, child) in _fieldControls)
        {
            childControls[key] = child;
        }
    }

    // Collect element controls
    if (_elementControls != null)
    {
        for (int i = 0; i < _elementControls.Count; i++)
        {
            childControls[i.ToString()] = _elementControls[i];
        }
    }

    // Reconstruct using behavior - passes controls instead of values
    _value = _behavior.CloneWith(_value, childControls);
    _flags &= ~ControlFlags.ChildValueDirty;
}
```

**Note**: No reconstruction method needed for `InitialValue` - it only flows from parent to child via `PropagateInitialValueToChildren()` in `SetInitialValueInternal()`.

### 4. UpdateChildValue - Simplified

**Child updates just mark parent dirty:**

```csharp
void IControlMutation.UpdateChildValue(object key, object? value)
{
    // Just mark as dirty - reconstruction happens lazily
    _flags |= ControlFlags.ChildValueDirty;

    // Notify subscribers that value changed
    _subscriptions?.ApplyChange(ControlChange.Value);

    // Propagate up to parent
    ((IControlMutation)this).NotifyParentsOfChange();
}
```

**Note:** The `key` and `value` parameters are no longer used since we reconstruct from child controls directly. They could be removed from the interface, but keeping them maintains compatibility and documents the source of the change.

### 5. IsDirty - Triggers Reconstruction

**Use Value property (not _value field) to trigger reconstruction:**

```csharp
public bool IsDirty => !IControl.IsEqual(Value, InitialValue);
```

This ensures that when reactive tracking checks `IsDirty` via `GetChangeState`, it triggers reconstruction and sees the correct computed value.

### 6. SetValueInternal - No Mutability Tracking

**Simplified value setting without mutability flags:**

```csharp
bool IControlMutation.SetValueInternal(ControlEditor editor, object? value)
{
    var oldValue = _value;
    var changed = !IControl.IsEqual(_value, value);

    if (changed)
    {
        _value = (T)value!;
        _flags &= ~ControlFlags.ChildValueDirty; // Clear dirty flag - we have external value

        // Clear errors unless DontClearError flag is set
        if ((_flags & ControlFlags.DontClearError) == 0)
        {
            ((IControlMutation)this).ClearErrorsInternal(editor);
        }

        // Handle child controls based on value type change
        if (ShouldClearChildren(oldValue, value))
        {
            ClearAllChildControls();
        }
        else
        {
            UpdateChildControlValues(editor, value);
        }

        _subscriptions?.ApplyChange(ControlChange.Value);
        ((IControlMutation)this).NotifyParentsOfChange();
        return true;
    }

    return false;
}
```

### 7. Structural Operations - Option C

**AddElementInternal and RemoveElementInternal use reconstruction:**

```csharp
internal void AddElementInternal(object? value)
{
    if (!IsArray)
        return;

    // Create child control for the new element
    var newIndex = _elementControls?.Count ?? 0;
    EnsureElementControlsCreated();

    var childControl = _behavior.CreateChildElement(this, newIndex);
    if (childControl != null)
    {
        AttachChildControl(childControl, newIndex);
        _elementControls!.Add(childControl);

        // Set the child's value
        var editor = new ControlEditor();
        editor.SetValue(childControl, value);
    }

    // Mark parent dirty - reconstruction will build array from element controls
    _flags |= ControlFlags.ChildValueDirty;
    _subscriptions?.ApplyChange(ControlChange.Structure);
    InvalidateChildValidityCache();
}

internal void RemoveElementInternal(int index)
{
    if (!IsArray || _elementControls == null || index < 0 || index >= _elementControls.Count)
        return;

    var removedControl = _elementControls[index];
    if (removedControl is IControlMutation childMutation)
    {
        childMutation.UpdateParentLink(this, null); // Remove parent link
    }
    _elementControls.RemoveAt(index);

    // Mark parent dirty - reconstruction will build array from remaining element controls
    _flags |= ControlFlags.ChildValueDirty;
    _subscriptions?.ApplyChange(ControlChange.Structure);
    InvalidateChildValidityCache();
}
```

### 8. ControlBehavior Changes

**Change CloneWith signature to receive controls instead of values:**

Old signature:
```csharp
Func<T?, IDictionary<string, object?>, T> CloneWith
```

New signature:
```csharp
Func<T?, IDictionary<string, IControl>, T> CloneWith
```

This allows behaviors to access child control metadata (errors, touched state, etc.) during reconstruction if needed. Behaviors can still just access `.Value` on each control for the simple case.

**Updated reconstruction method:**

```csharp
private void ReconstructValueFromChildren()
{
    var childControls = new Dictionary<string, IControl>();

    // Collect field controls
    if (_fieldControls != null)
    {
        foreach (var (key, child) in _fieldControls)
        {
            childControls[key] = child;
        }
    }

    // Collect element controls
    if (_elementControls != null)
    {
        for (int i = 0; i < _elementControls.Count; i++)
        {
            childControls[i.ToString()] = _elementControls[i];
        }
    }

    // Reconstruct using behavior - passing controls instead of values
    _value = _behavior.CloneWith(_value, childControls);
    _flags &= ~ControlFlags.ChildValueDirty;
}
```

**Updated DefaultClone implementation:**

```csharp
private static T DefaultClone(T? original, IDictionary<string, IControl> children)
{
    // Convert IControl dictionary to values dictionary
    var overrides = children.ToDictionary(kvp => kvp.Key, kvp => kvp.Value.Value);

    // ... rest of implementation uses overrides dictionary as before
}
```

## Migration Notes

### Breaking Changes

1. **ControlFlags values change** - Any code checking `ControlFlags.ValueMutable` must be updated to `ControlFlags.ChildValueDirty`
2. **ControlFlags.InitialValueMutable removed** - This flag is no longer needed (InitialValue only flows top-down)
3. **ControlBehavior.CloneWith signature change** - Now receives `IDictionary<string, IControl>` instead of `IDictionary<string, object?>`
4. **Value/InitialValue return null for undefined** - Previously returned `UndefinedValue.Instance`, now returns `null` (use `IsUndefined` property to check for undefined state)
5. **Mutability assumptions** - Code assuming values can be mutated in place must be updated

### Non-Breaking Changes

- Public API remains the same
- `UpdateChildValue` signature unchanged (parameters preserved even if unused)
- Behavior of Value/InitialValue properties unchanged from caller perspective

## Testing Considerations

### Key Scenarios to Test

1. **Basic child update** - Set child value, verify parent Value reflects change
2. **Multiple child updates** - Change multiple children, verify single reconstruction
3. **Deferred access** - Change child, don't access parent Value, verify no reconstruction
4. **IsDirty tracking** - Verify reactive dependencies trigger correctly
5. **Structural operations** - Test AddElement/RemoveElement reconstruction
6. **Nested updates** - Child change → parent reconstruction → grandparent dirty chain
7. **Initial value propagation** - Verify SetInitialValue on parent correctly propagates to children (top-down only)

### Performance Testing

- Measure reconstruction cost vs. current eager approach
- Verify bulk updates show performance improvement
- Check memory usage (deferred reconstruction shouldn't accumulate garbage)

## Open Questions

1. **Should we remove ErrorsMutable flag?** - Errors might not need mutability tracking either
2. **Count property behavior** - Should `Count` trigger reconstruction? Currently uses `Value` which would trigger it.

## Future Enhancements

1. **Partial reconstruction** - Track which children changed and only reconstruct affected parts
2. **Reconstruction batching** - Explicit "begin/end update" methods to defer even structure changes
3. **Debug tracing** - Add optional logging to track reconstruction patterns