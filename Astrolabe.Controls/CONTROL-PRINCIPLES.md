# Control System Guiding Principles

This document outlines the core principles that govern the Astrolabe Controls system design and usage.

## 1. Immutability of Control Values

**Principle**: Values retrieved from `IControl` are always immutable.

- When you access `control.Value` or `control.InitialValue`, the returned object should never be modified directly
- The Control system ensures immutability by cloning values when they transition from internal mutable state to external access
- This guarantees that external code cannot accidentally corrupt the control's internal state

```csharp
// ✅ Correct - read-only access
var value = control.Value;
var name = ((Dictionary<string, object>)value)["name"]; // Safe to read

// ❌ Incorrect - never modify returned values
var value = control.Value;
((Dictionary<string, object>)value)["name"] = "new value"; // DON'T DO THIS
```

## 2. All Modifications Through ControlEditor

**Principle**: Any changes to Controls should be done using the `ControlEditor`.

- Never call mutation methods directly on controls
- Always use the `ControlEditor` instance to perform modifications
- The `ControlEditor` manages transactions, change tracking, and listener notifications

```csharp
// ✅ Correct - use ControlEditor
var editor = new ControlEditor();
editor.SetValue(control, newValue);
editor.SetDisabled(control, true);

// ❌ Incorrect - never call mutation methods directly
((IControlMutation)control).SetValueInternal(editor, newValue); // DON'T DO THIS
```

## 3. ControlEditor Uses RunWithMutator Pattern

**Principle**: `ControlEditor` should use `RunWithMutator` to call `IControlMutation` methods for any modifications.

- All modification methods in `ControlEditor` follow the `RunWithMutator` pattern
- This pattern ensures proper transaction management and change tracking
- Only controls that implement `IControlMutation` can be modified
- Changes are batched and committed when the transaction completes

```csharp
// Internal ControlEditor pattern
private void RunWithMutator(IControl control, Func<IControlMutation, bool> action)
{
    RunInTransaction(() =>
    {
        if (control is not IControlMutation mutator) return;
        if (action(mutator))
        {
            _modifiedControls.Add(control);
        }
    });
}

public void SetValue(IControl control, object? value)
{
    RunWithMutator(control, x => x.SetValueInternal(this, value));
}
```

## 4. Value Flows Bidirectionally, InitialValue Flows Top-Down

**Principle**: `Value` synchronizes bidirectionally between parents and children, but `InitialValue` only flows from parent to child.

- **Value synchronization**:
  - Parent → Child: When `SetValue` is called on a parent, changes propagate to child controls
  - Child → Parent: When a child's value changes, the parent is marked dirty and lazily reconstructs its value from all children

- **InitialValue synchronization**:
  - Parent → Child: When `SetInitialValue` is called on a parent, it propagates to child controls
  - Child → Parent: **Never synchronizes back up** - children's initial values don't affect parent's initial value

```csharp
var editor = new ControlEditor();
var parent = Control.CreateStructured(new { Name = "John", Age = 30 });
var nameControl = parent["Name"];

// InitialValue flows down
editor.SetInitialValue(parent, new { Name = "Jane", Age = 25 });
// nameControl.InitialValue is now "Jane"

// Value flows up (lazy reconstruction)
editor.SetValue(nameControl, "Bob");
// parent.Value will reconstruct to { Name = "Bob", Age = 30 } when accessed

// InitialValue changes on child don't flow up
editor.SetInitialValue(nameControl, "Alice");
// parent.InitialValue is unchanged - still { Name = "Jane", Age = 25 }
```

**Rationale**: InitialValue represents the "reset point" for the form, set externally by the application. It makes no sense for child modifications to affect where the parent resets to. Only Value needs bidirectional sync to maintain structural consistency.

## Benefits of These Principles

1. **Data Integrity**: Immutability prevents accidental corruption of control state
2. **Predictable Behavior**: Centralized modification through ControlEditor ensures consistent behavior
3. **Change Tracking**: Transaction-based modifications enable proper listener notifications
4. **Thread Safety**: Immutable external values reduce concurrency concerns
5. **Maintainability**: Clear separation between read and write operations
6. **Clear Data Flow**: Unidirectional InitialValue flow simplifies mental model and avoids reconstruction complexity

## Common Patterns

### Reading Values
```csharp
// Always safe to read
var currentValue = control.Value;
var isModified = control.IsDirty;
var fieldValue = control["fieldName"]?.Value;
```

### Modifying Values
```csharp
var editor = new ControlEditor();

// Simple value changes
editor.SetValue(control, newValue);
editor.SetInitialValue(control, initialValue);

// State changes
editor.SetDisabled(control, true);
editor.SetTouched(control, true);

// Object/Array operations
editor.SetField(control, "name", "John");
editor.AddElement(arrayControl, newItem);
editor.RemoveElement(arrayControl, index);
```

### Batch Operations
```csharp
var editor = new ControlEditor();
editor.RunInTransaction(() =>
{
    editor.SetValue(control1, value1);
    editor.SetValue(control2, value2);
    editor.SetDisabled(control3, true);
    // All changes committed together when transaction completes
});
```