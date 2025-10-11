# New Type Design for IControl

## Overview

Rethinking the typed API for IControl (ITypedControl<T>). The `IControlProperties<out T>` approach is being removed in favor of a simpler design.

## Design Rationale

### IControl Simplification
- Roll `IControlProperties<out T>` into `IControl` directly
- Use `object?` for values in IControl
- **Reason**: IControl represents JSON, so untyped values are acceptable
- Type safety is provided through `IReactive<T>` instead

### Generic Types Use Case
Generic types are for representing an instance of a standard POCO and optionally being able to override properties with Control's.

## IReactive<T> Interface

```csharp
interface IReactive<T> {
    // Get a value from the underlying object.
    T2 Get<T2>(Expression<Func<T, T2>> selector)

    // Get a reactive wrapper for nested objects.
    // Use this when navigating to nested POCOs.
    IReactive<T2> GetReactive<T2>(Expression<Func<T, T2>> selector)

    // Lazily create a control for the given selector. Cache in a dictionary.
    // Use this for UI binding to a property.
    IControl GetControl<T2>(Expression<Func<T, T2>> selector)

    // See if we already have a control for the given selector.
    bool HaveControl<T2>(Expression<Func<T, T2>> selector)
}
```

## Implementation Details

### Expression Caching
- Expression parsing should be cached to avoid overhead on every call
- Cache compiled accessors or expression tree analysis results
- Use expression tree analysis to determine property paths

### Control and Reactive Caching
- Controls created via `GetControl` are cached in a dictionary
- Reactive wrappers created via `GetReactive` are also cached in a dictionary
- Both caches are unbounded (fine for typical use cases)
- Cache keys are derived from the expression selectors
- Enables efficient reuse of controls and reactive wrappers for the same properties

### Method Usage
- **Get**: Direct value access for simple reads
- **GetReactive**: Navigate to nested objects while maintaining type safety (returns `IReactive<T2>`)
- **GetControl**: Create/retrieve UI-bindable controls (returns `IControl`)
- **HaveControl**: Check if a control already exists without creating one

## ChangeTracker Redesign

### Changes to ChangeTracker
With `ITypedControl<T>` and `IControlProperties<T>` removed, ChangeTracker needs to be redesigned:

- **Make `RecordAccess` public**: This becomes the core public API
- **Remove `Tracked<T>` method**: No longer needed with `ITypedControl<T>` gone
- **Remove `TrackElements` method**: Replaced by extension method
- **Remove `TrackedControlProxy<T>` class**: Proxy pattern no longer needed

### Extension Methods Pattern
Tracking functionality is provided through extension methods that work with `IReactive<T>`:

```csharp
public static T2 TrackValue<T, T2>(this ChangeTracker tracker, IReactive<T> reactive, Expression<Func<T, T2>> selector)
{
    // Only record access if a control already exists
    // Assumption: Controls are already set up for anything that can change
    if (reactive.HaveControl(selector))
    {
        var control = reactive.GetControl(selector);
        tracker.RecordAccess(control, ControlChange.Value);
    }
    return reactive.Get(selector);
}

public static IReadOnlyList<IControl> TrackElements(this ChangeTracker tracker, IControl control)
{
    tracker.RecordAccess(control, ControlChange.Structure);
    return control.Elements;
}

public static bool TrackIsDirty<T>(this ChangeTracker tracker, IReactive<T> reactive, Expression<Func<T, object>> selector)
{
    if (reactive.HaveControl(selector))
    {
        var control = reactive.GetControl(selector);
        tracker.RecordAccess(control, ControlChange.Dirty);
    }
    // Return dirty state from control if it exists
}

public static T2 TrackInitialValue<T, T2>(this ChangeTracker tracker, IReactive<T> reactive, Expression<Func<T, T2>> selector)
{
    if (reactive.HaveControl(selector))
    {
        var control = reactive.GetControl(selector);
        tracker.RecordAccess(control, ControlChange.InitialValue);
    }
    // Return initial value
}
```

### Key Principles
- **No automatic control creation**: `TrackValue` only records access if a control already exists via `HaveControl` check
- **Rationale**: Controls should already be set up for anything that can change reactively
- **Simpler API**: One public method (`RecordAccess`) with composable extension methods
- **Expression-based**: Works naturally with the `IReactive<T>` expression API

## Benefits

1. **Type Safety**: Expression-based API is type-safe and refactoring-friendly
2. **Simplicity**: Removes complex generic constraints from IControl and eliminates ITypedControl entirely
3. **Separation of Concerns**: Typed POCO navigation (`IReactive<T>`) separated from untyped control interface (`IControl`)
4. **Efficiency**: Lazy control creation with caching avoids unnecessary allocations
5. **JSON Interop**: IControl's untyped nature aligns with JSON representation
6. **Flexible Tracking**: Extension method pattern allows custom tracking behavior without modifying core ChangeTracker

