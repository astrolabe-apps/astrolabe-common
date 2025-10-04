# Control Error System Design

This document outlines the design for adding error management to the Astrolabe Controls system, following the established Control principles.

## Overview

The error system provides validation and error tracking capabilities for Controls while maintaining immutability, centralized modification through ControlEditor, and proper change notifications.

## Core Components

### 1. Error Representation

Errors are represented as a simple dictionary mapping error keys to error messages, following the TypeScript library pattern:

```csharp
// No custom error interface needed - use built-in dictionary
// IReadOnlyDictionary<string, string> where:
//   - Key: error type/code (e.g., "required", "minLength", "custom")
//   - Value: error message
```

### 2. IControl Extensions

Add error-related properties to the `IControl` interface:

```csharp
public interface IControl
{
    // ... existing properties ...
    
    // Error management
    IReadOnlyDictionary<string, string> Errors { get; }
    bool HasErrors => Errors.Count > 0;
    bool IsValid => !HasErrors;
}
```

### 3. IControlMutation Extensions

Add error mutation methods to `IControlMutation`:

```csharp
internal interface IControlMutation
{
    // ... existing methods ...
    
    // Error management
    bool SetErrorsInternal(ControlEditor editor, IDictionary<string, string> errors);
    bool SetErrorInternal(ControlEditor editor, string key, string? message); // null or empty message = remove
    bool ClearErrorsInternal(ControlEditor editor);
}
```

### 4. ControlEditor Error Methods

Add public error management methods to `ControlEditor`:

```csharp
public class ControlEditor
{
    // ... existing methods ...
    
    // Error management methods
    public void SetErrors(IControl control, IDictionary<string, string> errors)
    {
        RunWithMutator(control, x => x.SetErrorsInternal(this, errors));
    }
    
    public void SetError(IControl control, string key, string? message)
    {
        RunWithMutator(control, x => x.SetErrorInternal(this, key, message));
    }
    
    public void ClearErrors(IControl control)
    {
        RunWithMutator(control, x => x.ClearErrorsInternal(this));
    }
}
```

### 5. Control Implementation

Update the `Control` class to implement error management:

```csharp
public class Control : IControl, IControlMutation
{
    // ... existing fields ...
    
    private Dictionary<string, string>? _errors;
    private ControlFlags _flags; // Add ErrorsMutable flag

    // Public immutable access
    public IReadOnlyDictionary<string, string> Errors
    {
        get
        {
            if ((_flags & ControlFlags.ErrorsMutable) != 0)
            {
                // Errors are mutable (we own them), clone and freeze for external access
                _errors = _errors?.ToDictionary(x => x.Key, x => x.Value);
                _flags &= ~ControlFlags.ErrorsMutable;
            }
            return _errors?.AsReadOnly() ?? EmptyErrors;
        }
    }

    private static readonly IReadOnlyDictionary<string, string> EmptyErrors = 
        new Dictionary<string, string>().AsReadOnly();

    // Internal mutable access for parent-child operations
    internal IReadOnlyDictionary<string, string> InternalErrors => _errors?.AsReadOnly() ?? EmptyErrors;

    // IControlMutation implementation
    bool IControlMutation.SetErrorsInternal(ControlEditor editor, IDictionary<string, string> errors)
    {
        // Remove empty/null values from input
        var cleanedErrors = errors.Where(x => !string.IsNullOrEmpty(x.Value))
                                  .ToDictionary(x => x.Key, x => x.Value);
        
        if (DictionariesEqual(_errors, cleanedErrors)) return false;

        _errors = cleanedErrors.Count > 0 ? new Dictionary<string, string>(cleanedErrors) : null;
        _flags |= ControlFlags.ErrorsMutable; // Mark as mutable since we own them

        _subscriptions?.ApplyChange(ControlChange.Errors);
        return true;
    }

    bool IControlMutation.SetErrorInternal(ControlEditor editor, string key, string? message)
    {
        // Check current state first to avoid unnecessary mutations
        var currentHasError = _errors?.ContainsKey(key) == true;
        var currentMessage = currentHasError ? _errors![key] : null;
        var newMessage = string.IsNullOrEmpty(message) ? null : message;
        
        // No change needed
        if (currentMessage == newMessage) return false;
        
        // Now we know a change is needed - ensure we own the errors dictionary
        if ((_flags & ControlFlags.ErrorsMutable) == 0)
        {
            _errors = _errors?.ToDictionary(x => x.Key, x => x.Value) ?? new Dictionary<string, string>();
            _flags |= ControlFlags.ErrorsMutable;
        }
        
        if (newMessage == null)
        {
            // Remove error (we already know it exists from the check above)
            _errors!.Remove(key);
        }
        else
        {
            // Set/update error
            _errors![key] = newMessage;
        }

        // Clean up empty dictionary
        if (_errors!.Count == 0)
        {
            _errors = null;
            _flags &= ~ControlFlags.ErrorsMutable;
        }

        _subscriptions?.ApplyChange(ControlChange.Errors);
        return true;
    }

    bool IControlMutation.ClearErrorsInternal(ControlEditor editor)
    {
        if (_errors == null || _errors.Count == 0) return false;

        _errors = null;
        _flags &= ~ControlFlags.ErrorsMutable;
        _subscriptions?.ApplyChange(ControlChange.Errors);
        return true;
    }

    private static bool DictionariesEqual(IDictionary<string, string>? dict1, IDictionary<string, string>? dict2)
    {
        if (dict1 == null && dict2 == null) return true;
        if (dict1 == null || dict2 == null) return false;
        if (dict1.Count != dict2.Count) return false;

        foreach (var kvp in dict1)
        {
            if (!dict2.TryGetValue(kvp.Key, out var value) || value != kvp.Value)
                return false;
        }
        return true;
    }
}
```

### 6. Updated Enums

Update the supporting enums:

```csharp
[Flags]
public enum ControlFlags
{
    None = 0,
    Disabled = 1,
    Touched = 2,
    ValueMutable = 4,
    InitialValueMutable = 8,
    ErrorsMutable = 16
}

[Flags]
public enum ControlChange
{
    None = 0,
    Value = 1,
    InitialValue = 2,
    Disabled = 4,
    Touched = 8,
    Structure = 16,
    Errors = 32,
    Dirty = 64,
    Valid = 128
}
```

## Validation Integration

### Validator Interface

```csharp
public interface IControlValidator
{
    IDictionary<string, string> Validate(IControl control);
}

public delegate IDictionary<string, string> ValidatorFunc(IControl control);

public class FuncValidator : IControlValidator
{
    private readonly ValidatorFunc _validator;

    public FuncValidator(ValidatorFunc validator)
    {
        _validator = validator;
    }

    public IDictionary<string, string> Validate(IControl control)
    {
        return _validator(control);
    }
}
```

### ControlEditor Validation Methods

```csharp
public class ControlEditor
{
    // ... existing methods ...
    
    public void ValidateControl(IControl control, IControlValidator validator)
    {
        var errors = validator.Validate(control);
        SetErrors(control, errors);
    }
    
    public void ValidateControl(IControl control, ValidatorFunc validator)
    {
        ValidateControl(control, new FuncValidator(validator));
    }
    
    public void ValidateControlTree(IControl control, IControlValidator validator)
    {
        RunInTransaction(() =>
        {
            ValidateControlRecursive(control, validator);
        });
    }
    
    private void ValidateControlRecursive(IControl control, IControlValidator validator)
    {
        // Validate current control
        ValidateControl(control, validator);
        
        // Validate children
        if (control.IsObject)
        {
            foreach (var fieldName in control.FieldNames)
            {
                var child = control[fieldName];
                if (child != null)
                {
                    ValidateControlRecursive(child, validator);
                }
            }
        }
        else if (control.IsArray)
        {
            foreach (var element in control.Elements)
            {
                ValidateControlRecursive(element, validator);
            }
        }
    }
}
```

## Usage Examples

### Basic Error Management

```csharp
var editor = new ControlEditor();
var control = Control.Create("initial value");

// Set individual errors
editor.SetError(control, "required", "Value is required");
editor.SetError(control, "minLength", "Value must be at least 5 characters");

// Set multiple errors at once
editor.SetErrors(control, new Dictionary<string, string>
{
    ["required"] = "Value is required",
    ["minLength"] = "Value must be at least 5 characters"
});

// Read errors (immutable)
var errors = control.Errors; // Safe to read, cannot be modified
var hasErrors = control.HasErrors;
var isValid = control.IsValid;
var requiredError = control.Errors.TryGetValue("required", out var msg) ? msg : null;

// Remove specific error (set to null or empty)
editor.SetError(control, "required", null);
editor.SetError(control, "minLength", ""); // equivalent to null

// Clear all errors
editor.ClearErrors(control);
```

### Validation Integration

```csharp
var editor = new ControlEditor();
var control = Control.Create("");

// Define validator returning dictionary
editor.ValidateControl(control, ctrl =>
{
    var errors = new Dictionary<string, string>();
    var value = ctrl.Value as string;
    
    if (string.IsNullOrEmpty(value))
        errors["required"] = "Value is required";
    else if (value.Length < 5)
        errors["minLength"] = "Value must be at least 5 characters";
    
    return errors;
});

// Validate entire control tree
editor.ValidateControlTree(rootControl, validator);
```

### Change Subscriptions

```csharp
var subscription = control.Subscribe((ctrl, changes) =>
{
    if ((changes & ControlChange.Errors) != 0)
    {
        Console.WriteLine($"Errors changed: {ctrl.Errors.Count} errors");
    }
    
    if ((changes & ControlChange.Valid) != 0)
    {
        Console.WriteLine($"Validity changed: {(ctrl.IsValid ? "Valid" : "Invalid")}");
    }
}, ControlChange.Errors | ControlChange.Valid);
```

## Design Benefits

1. **Follows Control Principles**: Errors are immutable when accessed externally, modifications go through ControlEditor, and use the RunWithMutator pattern
2. **Consistent API**: Error management follows the same patterns as other Control operations
3. **Change Tracking**: Error changes trigger proper notifications and can be subscribed to
4. **Flexible Validation**: Supports both imperative error setting and declarative validation
5. **Tree Validation**: Can validate entire control hierarchies
6. **Performance**: Lazy cloning ensures good performance while maintaining immutability
7. **Type Safety**: Strong typing for errors and validation results

## Error Propagation Strategy

Errors are managed at the individual control level and do not automatically propagate to parent controls. This design choice provides:

- **Explicit Control**: Developers must explicitly decide how to handle child errors
- **Flexibility**: Different propagation strategies can be implemented as needed
- **Performance**: Avoids automatic cascading updates
- **Clarity**: Error ownership is clear and predictable

If error propagation is needed, it can be implemented through custom validation logic or utility methods.