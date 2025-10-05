# IControl Generic Design

## Overview

This document outlines the design for adding typed control access to the control system. Since structural controls (objects/arrays) are backed by `Dictionary<string, object>` and `IList`, `IControl` remains non-generic. Instead, we provide a method to obtain a typed view for leaf values.

## Current Architecture

`IControl` is non-generic and handles both structural navigation and value access:

```csharp
public interface IControl : IControlProperties<object?>
{
    // Structural navigation - returns non-generic controls
    IControl? this[string propertyName] { get; }
    IControl? this[int index] { get; }

    // Value access - always object?
    object? Value { get; }
    object? InitialValue { get; }

    // Subscriptions work with object? values
    ISubscription Subscribe(ChangeListenerFunc listener, ControlChange mask);
}
```

## Problem

When working with known types in C#, developers lose type safety:

```csharp
IControl nameControl = personControl["Name"];
string name = (string)nameControl.Value; // Requires cast
int age = (int)ageControl.Value;         // Requires cast
```

Subscriptions also lack type information:

```csharp
nameControl.Subscribe((ctrl, change, editor) => {
    string value = (string)ctrl.Value; // Cast needed
    ValidateName(value);
}, ControlChange.Value);
```

## Proposed Solution

### Add a Typed View Interface

```csharp
public interface ITypedControl<out T> : IControlProperties<T>
{
    int UniqueId { get; }

    // Subscriptions - uses same listener as IControl since you already have the typed control
    ISubscription Subscribe(ChangeListenerFunc listener, ControlChange mask);
    void Unsubscribe(ISubscription subscription);
}
```

### Add AsTyped Method to IControl

```csharp
public interface IControl : IControlProperties<object?>
{
    // ... existing members ...

    /// <summary>
    /// Returns a typed view of this control. Use this when you know the control's value type.
    /// Throws InvalidCastException if the control's value cannot be cast to T.
    /// </summary>
    ITypedControl<T> AsTyped<T>();
}
```

### Implementation in Control Class

```csharp
public class Control : IControl
{
    // ... existing implementation ...

    public ITypedControl<T> AsTyped<T>()
    {
        // Check if current value is compatible with T
        if (Value != null && Value is not T && Value is not UndefinedValue)
        {
            throw new InvalidCastException(
                $"Cannot cast control value of type {Value.GetType().Name} to {typeof(T).Name}");
        }

        return new TypedControlView<T>(this);
    }

    // Internal wrapper class
    private class TypedControlView<T>(Control control) : ITypedControl<T>
    {
        public int UniqueId => control.UniqueId;

        public T Value => (T)control.Value!;
        public T InitialValue => (T)control.InitialValue!;

        public bool IsDirty => control.IsDirty;
        public bool IsDisabled => control.IsDisabled;
        public bool IsTouched => control.IsTouched;
        public bool IsValid => control.IsValid;

        public IReadOnlyDictionary<string, string> Errors => control.Errors;

        public ISubscription Subscribe(ChangeListenerFunc listener, ControlChange mask)
        {
            // Delegate directly to underlying control
            return control.Subscribe(listener, mask);
        }

        public void Unsubscribe(ISubscription subscription)
        {
            control.Unsubscribe(subscription);
        }
    }
}
```

## Usage Examples

### Example 1: Type-Safe Value Access

```csharp
IControl personControl = GetPersonControl();

// Navigate using non-generic IControl, then get typed views
var nameControl = personControl["Name"];
var ageControl = personControl["Age"];

// Get typed views - throws if type doesn't match
var typedName = nameControl?.AsTyped<string>();
string name = typedName.Value; // No cast needed!
Console.WriteLine($"Name: {name}");

var typedAge = ageControl?.AsTyped<int>();
int age = typedAge.Value; // No cast needed!
Console.WriteLine($"Age: {age}");
```

### Example 2: Type-Safe Subscriptions

```csharp
var nameControl = personControl["Name"]?.AsTyped<string>();
if (nameControl != null)
{
    nameControl.Subscribe((ctrl, change, editor) =>
    {
        // Access typed control from outer scope - nameControl.Value is string
        if (string.IsNullOrWhiteSpace(nameControl.Value))
        {
            editor.SetError(ctrl, "required", "Name is required");
        }
    }, ControlChange.Value);
}
```

### Example 3: Validation Factory Method Pattern

```csharp
public static class ControlExtensions
{
    public static ITypedControl<T>? CreateTyped<T>(
        T? initialValue,
        Func<T?, string?> validator)
    {
        var control = Control.Create(initialValue, validator);
        return control.AsTyped<T>();
    }
}

// Usage
var emailControl = ControlExtensions.CreateTyped<string>(
    "",
    value => string.IsNullOrEmpty(value) ? "Email required" : null
);

// emailControl is ITypedControl<string>
emailControl.Subscribe((ctrl, change, editor) =>
{
    string email = emailControl.Value; // Strongly typed from outer scope
    Console.WriteLine($"Email changed to: {email}");
}, ControlChange.Value);
```

### Example 4: Mixed Navigation

```csharp
// Navigate structure with IControl, get typed views where needed
IControl formControl = GetFormControl();

void ValidateForm()
{
    var name = formControl["Name"]?.AsTyped<string>();
    var age = formControl["Age"]?.AsTyped<int>();
    var email = formControl["Email"]?.AsTyped<string>();

    if (name?.Value is string n && n.Length < 2)
    {
        // validation logic
    }

    if (age?.Value is int a && a < 18)
    {
        // validation logic
    }
}
```

### Example 5: Working with Arrays

```csharp
IControl arrayControl = GetArrayControl();

// Iterate over array elements
foreach (var element in arrayControl.Elements)
{
    // Try to get as specific type
    var personElement = element.AsTyped<Person>();
    if (personElement != null)
    {
        var person = personElement.Value;
        Console.WriteLine($"Person: {person.Name}");
    }
}
```

## Design Rationale

### Why Not Make IControl Generic?

1. **Implementation Reality**: Structural controls use `Dictionary<string, object>` and `IList<object?>` at runtime
2. **Dynamic Nature**: Object properties and array elements can have different types
3. **JavaScript Interop**: System is designed to work with dynamic JSON-like data
4. **Complexity**: Generic structural types would require complex type parameters like `IControl<Dictionary<string, object>>`

### Why This Approach Works

1. **Separation of Concerns**:
   - `IControl` handles structural navigation (objects/arrays)
   - `ITypedControl<T>` provides type-safe value access

2. **Opt-In Type Safety**: Developers choose when to use typing:
   - Use `IControl` for dynamic navigation
   - Use `AsTyped<T>()` when type is known

3. **No Breaking Changes**: Existing code continues to work unchanged

4. **Natural C# Patterns**: Similar to pattern matching and casting in C#:
   ```csharp
   if (control.AsTyped<string>() is var typed)
   {
       // work with typed
   }
   ```

5. **Lightweight**: `TypedControlView<T>` is just a wrapper with no state

6. **No Special Listener Delegate Needed**: Since you already have the typed control when subscribing, you can access typed properties from the outer scope rather than needing a typed callback parameter

## Alternative Considered: Separate Typed Control Type

An alternative would be to have separate control types:

```csharp
// For structural controls
IStructuralControl : IControlProperties<object?>
{
    IStructuralControl? this[string key] { get; }
    IStructuralControl? this[int index] { get; }
}

// For leaf controls
ITypedControl<T> : IControlProperties<T>
{
    // No indexers
}
```

**Rejected because:**
- Breaks existing code that expects `IControl`
- Loses ability to navigate then type-cast
- Requires knowing control type upfront
- More complex API surface

## Implementation Considerations

### Type Safety

The `AsTyped<T>()` method should:
- Throw `InvalidCastException` if value cannot be cast to `T`
- Handle nullable types properly
- Handle `UndefinedValue` appropriately (allow for any T)

```csharp
public ITypedControl<T> AsTyped<T>()
{
    // Allow null and undefined for any T
    if (Value == null || Value is UndefinedValue)
        return new TypedControlView<T>(this);

    // Check if value is compatible
    if (Value is not T)
    {
        throw new InvalidCastException(
            $"Cannot cast control value of type {Value.GetType().Name} to {typeof(T).Name}");
    }

    return new TypedControlView<T>(this);
}
```

**Fail-Fast Philosophy**: By throwing on type mismatch, the method enforces that developers only call `AsTyped<T>()` when they're confident about the type. This catches bugs early rather than allowing null references to propagate.

### Subscription Lifecycle

- Subscriptions created via `ITypedControl<T>` should still work if the control's type changes
- The wrapper pattern ensures the subscription is on the underlying `Control`
- Type mismatches will be caught when accessing `Value`

### Performance

- `TypedControlView<T>` is a lightweight wrapper
- No additional allocations beyond the wrapper itself
- Subscriptions delegate directly to underlying control
- Could consider caching wrappers if profiling shows benefit

## Migration Path

1. Add `ITypedControl<T>` interface
2. Add `AsTyped<T>()` method to `IControl`
3. Implement `TypedControlView<T>` in `Control` class
4. Update documentation and examples
5. Gradually adopt in type-safe scenarios (new code)

Existing code continues to work unchanged - this is purely additive.

## Benefits

1. **Type Safety**: Compile-time checking when types are known
2. **Better IDE Support**: IntelliSense shows correct types
3. **No Casts**: Direct access to typed values
4. **Clearer Intent**: `AsTyped<string>()` documents expected type
5. **Flexible**: Use typing where beneficial, ignore where not
6. **Backward Compatible**: No breaking changes
7. **Simple**: Easy to understand and use

## Design Decisions

1. ~~Should `AsTyped<T>()` throw an exception on type mismatch, or return `null`?~~
   - **Decision**: Throw `InvalidCastException` for fail-fast behavior

2. ~~How should nullable types be handled?~~
   - **Decision**: Both `AsTyped<string?>()` and `AsTyped<string>()` should work with appropriate null handling

3. ~~Should we provide helper methods for common scenarios?~~
   - **Decision**: No, keep API minimal

4. ~~Should `ITypedControl<T>` expose any structural navigation?~~
   - **Decision**: No, keep it focused on typed value access. Use `IControl` for navigation.

5. ~~Should there be a `TryAsTyped<T>(out ITypedControl<T>? typed)` method for cases where type is uncertain?~~
   - **Decision**: No, if types are uncertain use `IControl` directly