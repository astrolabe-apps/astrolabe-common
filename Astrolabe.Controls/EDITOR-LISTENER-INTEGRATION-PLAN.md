# ControlEditor Integration with Listeners Plan

This document outlines the plan for integrating `ControlEditor` with the subscription system to allow listeners to make control modifications.

## Problem Statement

Currently, `ChangeListenerFunc` has the signature:
```csharp
public delegate void ChangeListenerFunc(IControl control, ControlChange changeType);
```

This prevents listeners from making changes to controls because they don't have access to a `ControlEditor`. In validation scenarios, listeners need to set errors based on validation rules, but currently must create their own editor instances, leading to:

1. **Multiple Transactions**: Each listener creates its own editor and transaction
2. **Coordination Issues**: Listeners can't coordinate changes within a single atomic operation  
3. **Performance Overhead**: Multiple editor instances instead of reusing existing ones
4. **Inconsistent State**: Changes from different listeners may not be atomic

## Proposed Solution

Add `ControlEditor` as a parameter to the listener function signature and propagate it through the subscription system. Use a simple approach where:

- Core subscription methods take a `ControlEditor` parameter
- `Validate()` takes an optional `ControlEditor` parameter (creates one if null)
- Most call sites already have or can easily create an editor
- No complex nested transaction logic needed

## Implementation Plan

### 1. Update Core Signatures

#### **ChangeListenerFunc**
```csharp
// Before
public delegate void ChangeListenerFunc(IControl control, ControlChange changeType);

// After  
public delegate void ChangeListenerFunc(IControl control, ControlChange changeType, ControlEditor editor);
```

#### **Subscription System Methods**
```csharp
// SubscriptionList.cs
public void RunListeners(IControl control, ControlChange current, ControlEditor editor)
public void RunMatchingListeners(IControl control, ControlChange mask, ControlEditor editor)

// Subscriptions.cs
public void RunListeners(IControl control, ControlChange current, ControlEditor editor)
public void RunMatchingListeners(IControl control, ControlChange mask, ControlEditor editor)
```

#### **IControl Interface**
```csharp
// Before
bool Validate();

// After
bool Validate(ControlEditor? editor = null);
```

### 2. Update Control Implementation

#### **Validate() Method**
```csharp
public bool Validate(ControlEditor? editor = null)
{
    editor ??= new ControlEditor();
    
    editor.RunInTransaction(() => 
    {
        // First validate all children (pass editor down)
        WithChildren(child => child.Validate(editor));
        
        // Then run validation listeners for this control
        _subscriptions?.RunMatchingListeners(this, ControlChange.Validate, editor);
    });
    
    return IsValid;
}
```

#### **RunListeners() Method**
```csharp
void IControlMutation.RunListeners()
{
    var s = _subscriptions;
    if (s != null)
    {
        var editor = new ControlEditor();
        editor.RunInTransaction(() => 
        {
            var currentState = GetChangeState(s.Mask);
            s.RunListeners(this, currentState, editor);
        });
    }
}
```

### 3. Update All Call Sites

#### **Error Management Methods**
These already receive an editor parameter, so they'll pass it through:

```csharp
bool IControlMutation.SetErrorInternal(ControlEditor editor, string key, string? message)
{
    // ...existing logic...
    
    // Pass editor to parent notifications  
    NotifyParentsOfValidityChange(editor, _errors != null);
    
    return true;
}

private void NotifyParentsOfValidityChange(ControlEditor editor, bool hasErrors)
{
    if (_parents == null) return;

    foreach (var parentLink in _parents)
    {
        if (parentLink.Control is Control parentControl)
        {
            // Use provided editor instead of creating new one
            parentControl.InvalidateChildValidityCache(editor, hasErrors);
        }
    }
}
```

#### **Child Validation in Validate()**
```csharp
// In Validate() method
WithChildren(child => child.Validate(editor)); // Pass editor to children
```

### 4. Update Test Cases

All test cases that use `Subscribe()` need to be updated to handle the new signature:

```csharp
// Before
control.Subscribe((ctrl, change) =>
{
    var editor = new ControlEditor(); // Had to create own editor
    if (string.IsNullOrEmpty(ctrl.Value as string))
    {
        editor.SetError(ctrl, "required", "Value is required");
    }
}, ControlChange.Validate);

// After
control.Subscribe((ctrl, change, editor) =>
{
    // Editor provided automatically
    if (string.IsNullOrEmpty(ctrl.Value as string))
    {
        editor.SetError(ctrl, "required", "Value is required");
    }
}, ControlChange.Validate);
```

### 5. Implementation Order

1. ✅ **Update ChangeListenerFunc signature** - This breaks all existing code, forcing fixes
2. ✅ **Update subscription infrastructure (SubscriptionList, Subscriptions)** - Fix compile errors  
3. ✅ **Update IControl interface** - Add optional editor parameter to Validate()
4. ✅ **Update Control class implementation** - Fix RunListeners() and Validate()
5. ✅ **Update all test cases** - Fix broken tests with new listener signature
6. ✅ **Test and validate** - Ensure everything works correctly

## Benefits After Implementation

### 1. **Cleaner Validation Code**
```csharp
// Clean validation listener
control.Subscribe((ctrl, change, editor) =>
{
    if (ctrl.Value == null)
        editor.SetError(ctrl, "required", "Value is required");
    else
        editor.SetError(ctrl, "required", null);
}, ControlChange.Validate);
```

### 2. **Atomic Operations**
```csharp
var editor = new ControlEditor();
editor.RunInTransaction(() => 
{
    editor.SetValue(control, newValue);
    
    // Validation uses same editor/transaction
    control.Validate(editor);
    
    // All changes are atomic
});
```

### 3. **Better Performance**
- Single transaction for all listener changes
- Reuse editor instances instead of creating multiple
- Reduced transaction overhead

### 4. **Consistent State**
- All listener changes within a validation run are atomic
- Parent-child validity updates use same transaction
- No intermediate inconsistent states

## Breaking Changes

### Impact
- **All subscription usage** - Every `Subscribe()` call needs signature update
- **All test cases** - Need to handle new editor parameter
- **Validate() calls** - Optional parameter added (backward compatible for calls without parameters)

### Migration
- Update all listener lambdas to accept `editor` parameter
- Remove manual `ControlEditor` creation within listeners
- Update any direct calls to `RunListeners()` or `RunMatchingListeners()`

## Testing Strategy

### 1. **Core Functionality Tests**
- Verify listeners receive working editor
- Confirm editor changes are applied correctly
- Test transaction boundaries

### 2. **Validation Integration Tests**  
- Test `Validate()` with and without editor parameter
- Verify child validation uses same editor
- Test complex validation scenarios

### 3. **Error Management Tests**
- Verify error changes trigger proper listener notifications
- Test parent-child error propagation with shared editor
- Confirm validity cache updates work correctly

### 4. **Performance Tests**
- Verify single transaction per validation run
- Test editor reuse in nested scenarios
- Confirm no performance regression

## Examples of Usage

### Standalone Validation
```csharp
// Simple case - editor created automatically
bool isValid = control.Validate();
```

### Within Existing Transaction
```csharp
var editor = new ControlEditor();
editor.RunInTransaction(() => 
{
    // Multiple changes in single transaction
    editor.SetValue(control1, value1);
    editor.SetValue(control2, value2);
    
    // Validation reuses same editor
    control1.Validate(editor);
    control2.Validate(editor);
});
```

### Complex Validation Logic
```csharp
control.Subscribe((ctrl, change, editor) =>
{
    if ((change & ControlChange.Validate) != 0)
    {
        // Multi-step validation
        if (string.IsNullOrEmpty(ctrl.Value as string))
        {
            editor.SetError(ctrl, "required", "Value is required");
        }
        else if (((string)ctrl.Value).Length < 3)
        {
            editor.SetError(ctrl, "minLength", "Must be at least 3 characters");
        }
        else
        {
            // Clear all validation errors
            editor.SetError(ctrl, "required", null);
            editor.SetError(ctrl, "minLength", null);
        }
    }
}, ControlChange.Validate);
```

### Cross-Field Validation
```csharp
parentControl.Subscribe((ctrl, change, editor) =>
{
    if ((change & ControlChange.Validate) != 0)
    {
        var emailControl = ctrl["email"];
        var confirmControl = ctrl["confirmEmail"];
        
        if (emailControl?.Value != confirmControl?.Value)
        {
            editor.SetError(confirmControl!, "match", "Emails must match");
        }
        else
        {
            editor.SetError(confirmControl!, "match", null);
        }
    }
}, ControlChange.Validate);
```

## Conclusion

This plan provides a clean, straightforward approach to integrating `ControlEditor` with the subscription system. The solution:

- ✅ **Simple**: No complex nested transaction logic
- ✅ **Explicit**: Clear editor flow through call chain  
- ✅ **Flexible**: Works with and without existing editors
- ✅ **Efficient**: Reuses editors when possible
- ✅ **Backward Compatible**: `Validate()` optional parameter maintains compatibility

The implementation is straightforward and provides significant benefits for validation scenarios while maintaining the existing architecture patterns.