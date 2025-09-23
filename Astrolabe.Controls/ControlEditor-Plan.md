# ControlEditor Implementation Plan

## Overview

This document outlines the implementation plan for adding transaction-based control mutations through a `ControlEditor` class. This replaces direct control mutations with a batched notification system that provides better performance and consistency.

## Design Goals

- **Consistency**: All control changes follow the same batched notification pattern
- **Performance**: Batch notifications to prevent UI thrash and redundant updates
- **Clean API**: Separate public read-only API from internal mutation API
- **Nested Transactions**: Support transaction depth with proper batching

## Architecture Overview

```
ControlEditor ──► IControlMutation ──► Control
     │                                    │
     └─► Transaction Depth               └─► IControl (public read-only)
     └─► Notification Batching
```

## Core Components

### 1. Internal Mutation Interface

**Purpose**: Provide controlled access to control mutation operations
**File**: `IControlMutation.cs`

```csharp
internal interface IControlMutation
{
    void SetValueInternal(object? value);
    void NotifyChange(ControlChange changeType);
}
```

**Key Features**:
- Internal visibility - not exposed in public API
- Explicit interface implementation on Control class
- Provides mutation and notification capabilities to editor

### 2. Modified Control Class

**Purpose**: Implement read-only public API with internal mutation support
**File**: `Control.cs` (modified)

```csharp
public class Control : IControl, IControlMutation
{
    private object? _value;

    // Public API - read-only
    public virtual object? Value => _value;

    // Internal mutation API (explicit implementation)
    void IControlMutation.SetValueInternal(object? value)
    {
        if (!Equals(_value, value))
        {
            _value = value;
            // No notifications here - editor handles them
        }
    }

    void IControlMutation.NotifyChange(ControlChange changeType)
    {
        _subscriptions?.RunListeners(this, changeType);
    }

    // Constructor unchanged
    public Control(object? initialValue = null)
    {
        _value = initialValue;
    }

    // Subscription methods unchanged
    // Remove public Value setter completely
}
```

**Key Changes**:
- Remove public `Value` setter
- Add explicit `IControlMutation` implementation
- Internal `SetValueInternal` for value changes without notifications
- Internal `NotifyChange` for triggering notifications

### 3. ControlEditor Class

**Purpose**: Manage control mutations with transaction-based batching
**File**: `ControlEditor.cs`

```csharp
public class ControlEditor
{
    private int _transactionDepth = 0;
    private readonly HashSet<IControl> _modifiedControls = new();

    public void RunInTransaction(Action action)
    {
        _transactionDepth++;
        try
        {
            action();
        }
        finally
        {
            _transactionDepth--;
            if (_transactionDepth == 0)
            {
                CommitChanges();
            }
        }
    }

    public void SetValue(IControl control, object? value)
    {
        if (_transactionDepth > 0)
        {
            // In transaction - defer notifications
            if (control is IControlMutation mutator)
            {
                mutator.SetValueInternal(value);
                _modifiedControls.Add(control);
            }
        }
        else
        {
            // Auto-wrap in transaction for convenience
            RunInTransaction(() => SetValue(control, value));
        }
    }

    private void CommitChanges()
    {
        foreach (var control in _modifiedControls)
        {
            if (control is IControlMutation mutator)
            {
                mutator.NotifyChange(ControlChange.Value);
            }
        }
        _modifiedControls.Clear();
    }
}
```

**Key Features**:
- Transaction depth tracking for nested transactions
- Deferred notification batching
- Automatic transaction wrapping for single changes
- Clean separation using internal interface

## Implementation Strategy

### Phase 1: Create Internal Interface
1. **Create `IControlMutation.cs`** with internal mutation methods
2. **Define interface contract** for value setting and notification

### Phase 2: Modify Control Class
1. **Remove public Value setter** from Control class
2. **Implement IControlMutation explicitly** (internal interface)
3. **Update constructor and other methods** as needed
4. **Ensure backward compatibility** for read operations

### Phase 3: Implement ControlEditor
1. **Create ControlEditor class** with transaction depth tracking
2. **Implement RunInTransaction method** with proper nesting support
3. **Add SetValue method** with batching logic
4. **Create CommitChanges method** for notification batching

### Phase 4: Update Tests
1. **Modify existing tests** to use ControlEditor instead of direct assignment
2. **Add transaction-specific tests** for batching behavior
3. **Test nested transactions** and proper notification ordering
4. **Verify performance improvements** with batched notifications

### Phase 5: Advanced Features (Future)
1. **Add rollback support** for transaction failures
2. **Implement change validation** hooks
3. **Add debugging/logging** for transaction operations
4. **Performance monitoring** for large batch operations

## API Examples

### Basic Usage
```csharp
var editor = new ControlEditor();

// Single change (auto-wrapped in transaction)
editor.SetValue(control, "new value");

// Multiple changes (batched)
editor.RunInTransaction(() => {
    editor.SetValue(control1, "value1");
    editor.SetValue(control2, 42);
    editor.SetValue(control3, null);
}); // All notifications fire here
```

### Nested Transactions
```csharp
var editor = new ControlEditor();

editor.RunInTransaction(() => {
    editor.SetValue(control1, "outer value");

    editor.RunInTransaction(() => {
        editor.SetValue(control2, "inner value");
        editor.SetValue(control3, "another inner");
    }); // Notifications still deferred

    editor.SetValue(control4, "final outer");
}); // All notifications fire together here
```

### Read-Only Public API
```csharp
var control = new Control("initial");

// This works - reading values
var value = control.Value;

// This won't compile - no public setter
// control.Value = "new value"; // Compilation error

// Must use editor for mutations
editor.SetValue(control, "new value");
```

## Breaking Changes

### For Library Users
- **`control.Value = x` no longer compiles** - public setter removed
- **All mutations must go through `ControlEditor.SetValue()`**
- **Notification timing changes** - now batched instead of immediate

### Migration Guide
```csharp
// Old code
control.Value = "new value";

// New code
var editor = new ControlEditor();
editor.SetValue(control, "new value");

// Or for multiple changes
editor.RunInTransaction(() => {
    editor.SetValue(control1, "value1");
    editor.SetValue(control2, "value2");
});
```

## Benefits

### Performance
- **Batched notifications** prevent redundant UI updates
- **Reduced subscription firing** during complex operations
- **Better change detection** with transaction boundaries

### Consistency
- **Predictable notification timing** - always at transaction end
- **Consistent API** for all control mutations
- **No accidental immediate notifications**

### Maintainability
- **Clear separation** between public and internal APIs
- **Type-safe mutation operations** through interface
- **Extensible design** for future enhancements

## Future Considerations

### Transaction Rollback
```csharp
// Potential future enhancement
editor.RunInTransaction(() => {
    editor.SetValue(control1, "value1");
    if (someCondition)
        throw new InvalidOperationException(); // Auto-rollback
});
```

### Change Validation
```csharp
// Potential future enhancement
editor.RunInTransaction(() => {
    editor.SetValue(control, value, validator: (oldVal, newVal) => newVal != null);
});
```

### Async Transactions
```csharp
// Potential future enhancement
await editor.RunInTransactionAsync(async () => {
    await SomeAsyncValidation();
    editor.SetValue(control, "validated value");
});
```

This design provides a solid foundation for efficient, predictable control mutations while maintaining clean separation of concerns and extensibility for future enhancements.