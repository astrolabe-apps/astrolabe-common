# IControl Refactoring Plan

## Overview

This document outlines the detailed plan for refactoring the IControl type system to use `IReactive<T>` with expression-based property access, removing `ITypedControl<T>` and `IControlProperties<T>`.

## Phase 1: Core Interface Changes

### 1. Create IReactive<T> Interface
**File:** `Astrolabe.Controls/IReactive.cs` (new)

Create the new interface with expression-based API:

```csharp
namespace Astrolabe.Controls;

public interface IReactive<T>
{
    // Get a value from the underlying object
    T2 Get<T2>(Expression<Func<T, T2>> selector);

    // Get a reactive wrapper for nested objects
    // Use this when navigating to nested POCOs
    IReactive<T2> GetReactive<T2>(Expression<Func<T, T2>> selector);

    // Lazily create a control for the given selector. Cache in a dictionary.
    // Use this for UI binding to a property
    IControl GetControl<T2>(Expression<Func<T, T2>> selector);

    // See if we already have a control for the given selector
    bool HaveControl<T2>(Expression<Func<T, T2>> selector);
}
```

**Dependencies:** None

---

### 2. Update IControl Interface
**File:** `Astrolabe.Controls/IControl.cs`

Change IControl to no longer inherit from `ITypedControl<object?>`. Instead, add all properties directly:

```csharp
public interface IControl
{
    // Properties from IControlProperties (now using object?)
    object? Value { get; }
    object? InitialValue { get; }
    bool IsDirty { get; }
    bool IsDisabled { get; }
    bool IsTouched { get; }
    bool IsValid { get; }
    IReadOnlyDictionary<string, string> Errors { get; }
    bool IsUndefined { get; }
    bool HasErrors { get; }

    int UniqueId { get; }

    // Type detection
    bool IsArray { get; }
    bool IsObject { get; }
    int Count { get; }

    // Indexer access
    IControl? this[string propertyName] { get; }
    IControl? this[int index] { get; }

    // Collection properties
    IEnumerable<string> FieldNames { get; }
    IReadOnlyList<IControl> Elements { get; }

    // Subscription
    ISubscription Subscribe(ChangeListenerFunc listener, ControlChange mask);

    // Static methods (IsEqual, etc.) remain unchanged
}
```

**Dependencies:** Create IReactive<T> first

**Breaking Change:** Yes - removes inheritance from ITypedControl

---

### 3. Remove ITypedControl<T>
**File:** `Astrolabe.Controls/ITypedControl.cs` (delete)

Delete this file entirely as it's replaced by IReactive<T>.

**Dependencies:** Complete Phase 2 implementation first

**Breaking Change:** Yes - major API change

---

### 4. Remove IControlProperties<T>
**File:** `Astrolabe.Controls/IControlProperties.cs` (delete)

Delete this file entirely as its properties are now on IControl directly.

**Dependencies:** Update IControl first

**Breaking Change:** Yes - major API change

---

## Phase 2: Implementation Updates

### 5. Update Control Class
**File:** `Astrolabe.Controls/Control.cs`

Update the class declaration and implementation:

**Changes:**
- Change from `public class Control(...) : IControl, IControlMutation` to just implement IControl directly
- Remove `ITypedControl` implementation concerns
- Remove `AsTyped<T>()` method (or replace with factory for IReactive)
- Keep all existing property implementations (they already return object?)
- Update `UnderlyingControl` property to just return `this`

**Dependencies:** Update IControl interface first

---

### 6. Create Reactive<T> Class
**File:** `Astrolabe.Controls/Reactive.cs` (new)

Implement IReactive<T> with:

**Core features:**
- Expression parsing and caching (extract property paths from expressions)
- Dictionary for caching IControl instances per property
- Dictionary for caching IReactive<T2> instances per property
- Compile expressions to delegates for efficient value access

**Implementation outline:**
```csharp
public class Reactive<T> : IReactive<T>
{
    private readonly T _instance;
    private readonly IControl? _control;
    private readonly Dictionary<string, IControl> _controlCache = new();
    private readonly Dictionary<string, object> _reactiveCache = new();
    private readonly Dictionary<string, Delegate> _compiledAccessors = new();

    public Reactive(T instance, IControl? control = null)
    {
        _instance = instance;
        _control = control;
    }

    public T2 Get<T2>(Expression<Func<T, T2>> selector)
    {
        var accessor = GetOrCompileAccessor(selector);
        return ((Func<T, T2>)accessor)(_instance);
    }

    public IReactive<T2> GetReactive<T2>(Expression<Func<T, T2>> selector)
    {
        var key = GetPropertyPath(selector);
        if (!_reactiveCache.TryGetValue(key, out var cached))
        {
            var value = Get(selector);
            var control = HaveControl(selector) ? GetControl(selector) : null;
            cached = new Reactive<T2>(value, control);
            _reactiveCache[key] = cached;
        }
        return (IReactive<T2>)cached;
    }

    public IControl GetControl<T2>(Expression<Func<T, T2>> selector)
    {
        var key = GetPropertyPath(selector);
        if (!_controlCache.TryGetValue(key, out var control))
        {
            // Create control lazily based on _control and property path
            control = CreateControlForProperty(key);
            _controlCache[key] = control;
        }
        return control;
    }

    public bool HaveControl<T2>(Expression<Func<T, T2>> selector)
    {
        var key = GetPropertyPath(selector);
        return _controlCache.ContainsKey(key);
    }

    private string GetPropertyPath(LambdaExpression expression) { /* ... */ }
    private Delegate GetOrCompileAccessor(LambdaExpression expression) { /* ... */ }
    private IControl CreateControlForProperty(string propertyPath) { /* ... */ }
}
```

**Dependencies:** IReactive<T> interface exists

---

### 7. Update Control Factory Methods
**File:** `Astrolabe.Controls/Control.cs` (static methods)

Update or replace methods like:
- `CreateTyped<T>()` - Should return `IReactive<T>` instead of `ITypedControl<T>`
- Add `CreateReactive<T>(T instance)` factory method
- Keep existing `Control` constructor for plain IControl usage

**Dependencies:** Reactive<T> class implemented

---

## Phase 3: ChangeTracker Refactor

### 8. Refactor ChangeTracker
**File:** `Astrolabe.Controls/ChangeTracker.cs`

**Changes:**
- Make `RecordAccess` method public (change from `internal` to `public`)
- Remove `Tracked<T>()` method
- Remove `TrackElements()` method
- Remove the inner `TrackedControlProxy<T>` class entirely
- Keep all other methods: `SetCallback`, `UpdateSubscriptions`, `Dispose`, `OnControlChanged`

**Dependencies:** None (can be done independently)

---

### 9. Create ChangeTrackerExtensions
**File:** `Astrolabe.Controls/ChangeTrackerExtensions.cs` (new)

Create extension methods for common tracking patterns:

```csharp
namespace Astrolabe.Controls;

public static class ChangeTrackerExtensions
{
    public static T2 TrackValue<T, T2>(this ChangeTracker tracker, IReactive<T> reactive, Expression<Func<T, T2>> selector)
    {
        // Only record access if a control already exists
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

    public static bool TrackIsDirty<T>(this ChangeTracker tracker, IReactive<T> reactive, Expression<Func<T, object?>> selector)
    {
        if (reactive.HaveControl(selector))
        {
            var control = reactive.GetControl(selector);
            tracker.RecordAccess(control, ControlChange.Dirty);
            return control.IsDirty;
        }
        return false;
    }

    public static T2 TrackInitialValue<T, T2>(this ChangeTracker tracker, IReactive<T> reactive, Expression<Func<T, T2>> selector)
    {
        if (reactive.HaveControl(selector))
        {
            var control = reactive.GetControl(selector);
            tracker.RecordAccess(control, ControlChange.InitialValue);
            return (T2)control.InitialValue!;
        }
        return reactive.Get(selector);
    }

    public static bool TrackIsValid<T>(this ChangeTracker tracker, IReactive<T> reactive, Expression<Func<T, object?>> selector)
    {
        if (reactive.HaveControl(selector))
        {
            var control = reactive.GetControl(selector);
            tracker.RecordAccess(control, ControlChange.Valid);
            return control.IsValid;
        }
        return true;
    }

    public static bool TrackIsTouched<T>(this ChangeTracker tracker, IReactive<T> reactive, Expression<Func<T, object?>> selector)
    {
        if (reactive.HaveControl(selector))
        {
            var control = reactive.GetControl(selector);
            tracker.RecordAccess(control, ControlChange.Touched);
            return control.IsTouched;
        }
        return false;
    }

    public static bool TrackIsDisabled<T>(this ChangeTracker tracker, IReactive<T> reactive, Expression<Func<T, object?>> selector)
    {
        if (reactive.HaveControl(selector))
        {
            var control = reactive.GetControl(selector);
            tracker.RecordAccess(control, ControlChange.Disabled);
            return control.IsDisabled;
        }
        return false;
    }

    public static IReadOnlyDictionary<string, string> TrackErrors<T>(this ChangeTracker tracker, IReactive<T> reactive, Expression<Func<T, object?>> selector)
    {
        if (reactive.HaveControl(selector))
        {
            var control = reactive.GetControl(selector);
            tracker.RecordAccess(control, ControlChange.Error);
            return control.Errors;
        }
        return new Dictionary<string, string>();
    }
}
```

**Dependencies:** IReactive<T> interface, ChangeTracker refactored

---

## Phase 4: Related Components

### 10. Evaluate IStructuredControl<T>
**File:** `Astrolabe.Controls/IStructuredControl.cs`

**Decision needed:** Should `IStructuredControl<T>` be:
1. Replaced entirely by `IReactive<T>`?
2. Made to wrap `IReactive<T>` instead of having its own interface?
3. Kept as-is but updated to not reference `ITypedControl`?

**Current usage:** Used for POCO/record types that store state as dictionaries.

**Recommendation:** Replace with `IReactive<T>` or create a thin wrapper that delegates to `IReactive<T>`.

**Dependencies:** IReactive<T> implementation complete

---

### 11. Update StructuredControlExtensions
**File:** `Astrolabe.Controls/StructuredControlExtensions.cs`

Update extension methods like `Field()` to work with the new API:
- If keeping IStructuredControl, update it to work with IReactive
- If removing IStructuredControl, move extensions to work directly with IReactive<T>

**Dependencies:** Decision on IStructuredControl<T>

---

### 12. Update FormStateNode
**File:** `Astrolabe.Schemas/FormStateNode.cs`

**Changes:**
- Replace `ITypedControl<List<IFormStateNode>>` with either `IReactive<FormStateNodeData>` or plain `IControl`
- Update `Control.CreateTyped<List<IFormStateNode>>()` calls
- Update any property access patterns
- Review `MakeComputedWithPrevious` usage

**Dependencies:** Control factory methods updated, IReactive<T> available

---

## Phase 5: Test Updates

### 13. Update TypedControlTests.cs
**File:** `Astrolabe.Common.Tests/TypedControlTests.cs`

**Major rewrite needed:**
- Replace all `ITypedControl<T>` usage with `IReactive<T>` or plain `IControl`
- Update test patterns to use expression-based API
- Test the new caching behavior
- Verify expression parsing works correctly

**Dependencies:** All Phase 2 implementations complete

---

### 14. Update TypedControlApiTests.cs
**File:** `Astrolabe.Common.Tests/TypedControlApiTests.cs`

**Major rewrite needed:**
- Replace API tests for old typed system
- Add tests for IReactive<T> API
- Test Get, GetReactive, GetControl, HaveControl methods
- Test expression caching
- Test control and reactive wrapper caching

**Dependencies:** All Phase 2 implementations complete

---

### 15. Update ChangeTrackerTests.cs
**File:** `Astrolabe.Common.Tests/ChangeTrackerTests.cs`

**Changes:**
- Remove tests for `Tracked<T>()` proxy pattern
- Add tests for extension methods (TrackValue, TrackIsDirty, etc.)
- Verify HaveControl checks work correctly
- Test that tracking only occurs when controls exist

**Dependencies:** ChangeTrackerExtensions complete

---

### 16. Update Remaining Test Files
**Files:**
- `ValidationTests.cs`
- `ImmutabilityAndEqualityTests.cs`
- `EditorIntegrationTests.cs`
- `ControlEditorTests.cs`
- `UndefinedControlTests.cs`
- `ValidatorFactoryTests.cs`
- `TypeTransitionTests.cs`
- `ChildControlCleanupTests.cs`
- `SubscriptionTests.cs`
- `StructuredControlTests.cs`
- `ControlTests.cs`
- `ArrayObjectControlTests.cs`
- `FormStateNodeTests.cs` (in Astrolabe.Schemas.PDF.Tests)
- `FormStateNodeVisitorTests.cs`
- `PdfGeneratorTests.cs`

**Changes for each:**
- Search for `ITypedControl` and `IControlProperties` usage
- Replace with `IReactive<T>` or plain `IControl` as appropriate
- Update property access patterns
- Fix any compilation errors

**Dependencies:** All Phase 1-4 complete

---

## Phase 6: Validation

### 17. Build and Fix Compilation Errors
**Command:** `dotnet build Astrolabe.Common.sln`

Iteratively fix compilation errors as they arise:
1. Run build
2. Fix errors in order of dependency (interfaces → implementations → tests)
3. Repeat until clean build

**Dependencies:** All code changes attempted

---

### 18. Run Test Suite
**Commands:**
```bash
dotnet test Astrolabe.Common.sln
```

Fix failing tests:
1. Run full test suite
2. Analyze failures
3. Fix test code or implementation as needed
4. Repeat until all tests pass

**Dependencies:** Clean compilation

---

### 19. Update Documentation
**Files:** Various

Update:
- XML documentation comments on all modified interfaces and classes
- Inline code comments explaining caching strategies
- README or usage examples if they exist
- This refactoring plan to mark as complete

**Dependencies:** All tests passing

---

## Risk Areas

### High Risk
1. **Expression parsing** - Complex logic for extracting property paths from expression trees
2. **Caching strategy** - Ensuring cache keys work correctly for all expression types
3. **FormStateNode** - Complex usage of typed controls, may need significant rework

### Medium Risk
1. **Test coverage** - Large number of test files to update
2. **StructuredControl** - Decision on whether to keep or remove affects API surface
3. **Backwards compatibility** - Major breaking changes across the board

### Low Risk
1. **ChangeTracker** - Simple refactoring with clear migration path
2. **IControl updates** - Mostly additive changes

---

## Order of Execution

**Recommended order:**
1. Phase 1, steps 1-2 (Create IReactive, Update IControl) - Foundation
2. Phase 2, steps 5-7 (Control class, Reactive class, factory methods) - Core implementation
3. Phase 3, steps 8-9 (ChangeTracker refactor) - Independent, can be done anytime
4. Phase 4, steps 10-12 (Related components) - Depends on Phase 2
5. Phase 1, steps 3-4 (Delete old interfaces) - After everything compiles
6. Phase 5 (All tests) - After Phase 4 complete
7. Phase 6 (Validation) - Final steps

**Estimated effort:**
- Phase 1-2: 4-6 hours
- Phase 3: 1-2 hours
- Phase 4: 2-3 hours
- Phase 5: 4-6 hours
- Phase 6: 2-3 hours
- **Total: 13-20 hours**

---

## Success Criteria

- [ ] All compilation errors resolved
- [ ] All tests passing
- [ ] No references to ITypedControl<T> or IControlProperties<T> remain
- [ ] IReactive<T> API working with expression caching
- [ ] ChangeTracker extension methods working correctly
- [ ] Documentation updated
- [ ] Code review completed