# ChangeTracker Design Document

## Overview

The `ChangeTracker` provides automatic dependency tracking for expression evaluators in the C# version of `@astroapps/forms-core`. It allows code to explicitly track which controls are accessed during computation and automatically re-execute when any of those controls change.

## Design Goals

1. **Support Expression Evaluators**: Enable reactive computations that depend on multiple controls
2. **Explicit Tracking**: No "magic" - controls are tracked when explicitly wrapped with `Tracked()` and their properties accessed
3. **Fine-Grained Subscriptions**: Subscribe only to the specific properties that are accessed (Value, IsValid, etc.)
4. **Simple API**: Minimal surface area focused on the core use case
5. **Performance**: Efficient subscription management and change batching
6. **Lifecycle Management**: Proper cleanup of subscriptions

## Architecture

### Core Classes

```csharp
public class ChangeTracker : IDisposable
{
    public IControlProperties<T> Tracked<T>(ITypedControl<T> control);
    public void SetCallback(Action callback);
    public void UpdateSubscriptions();
    public void Dispose();
}

// Returns a proxy that tracks which properties are accessed
public interface IControlProperties<out T>
{
    T Value { get; }
    T InitialValue { get; }
    bool IsDirty { get; }
    bool IsDisabled { get; }
    bool IsTouched { get; }
    bool IsValid { get; }
    IReadOnlyDictionary<string, string> Errors { get; }
}
```

### Usage Pattern

```csharp
// 1. Create tracker
var tracker = new ChangeTracker();

// 2. Set up change callback
tracker.SetCallback(() => {
    // Re-evaluate when any tracked properties change
    var newResult = $"{nameTracked.Value} is {ageTracked.Value} years old";
    Console.WriteLine(newResult);

    // Update subscriptions based on what was accessed
    tracker.UpdateSubscriptions();
});

// 3. Initial evaluation - wrap controls with tracking proxies
var nameTracked = tracker.Tracked(nameControl);
var ageTracked = tracker.Tracked(ageControl);

var result = $"{nameTracked.Value} is {ageTracked.Value} years old";

// 4. Establish subscriptions based on what was tracked
tracker.UpdateSubscriptions();

// The tracker now subscribes only to Value changes on nameControl and ageControl
```

## Detailed Design

### 1. Dependency Tracking Mechanism

**Approach**: Track controls via proxy wrappers that record which properties are accessed.

```csharp
internal class TrackedControlProxy<T> : IControlProperties<T>
{
    private readonly ITypedControl<T> _control;
    private readonly ChangeTracker _tracker;

    public T Value
    {
        get
        {
            _tracker.RecordAccess(_control, ControlChange.Value);
            return _control.Value;
        }
    }

    public bool IsValid
    {
        get
        {
            _tracker.RecordAccess(_control, ControlChange.Valid);
            return _control.IsValid;
        }
    }

    // Similar for other properties...
}
```

**Benefits**:
- Explicit tracking - only accessed properties are monitored
- Fine-grained subscriptions - subscribe only to accessed properties (Value, IsValid, etc.)
- Automatic cleanup - unused controls/properties are automatically untracked
- Flexible - works with any control access pattern

### 2. Subscription Management

**Tracked Dependencies**: `Dictionary<IControl, ControlChange> _trackedAccess`
- Key: Control being tracked
- Value: Bitwise OR of all accessed properties (e.g., `ControlChange.Value | ControlChange.Valid`)

**Active Subscriptions**: `Dictionary<IControl, ISubscription> _subscriptions`

**Algorithm**:
```csharp
public void SetCallback(Action callback)
{
    _changeCallback = callback;
}

public void UpdateSubscriptions()
{
    // 1. Add or update subscriptions for tracked controls
    foreach (var (control, changeMask) in _trackedAccess)
    {
        // Dispose old subscription if mask changed
        if (_subscriptions.TryGetValue(control, out var oldSub))
        {
            if (oldSub.Mask != changeMask)
            {
                oldSub.Dispose();
                _subscriptions.Remove(control);
            }
            else
            {
                continue; // Subscription unchanged
            }
        }

        // Subscribe with the tracked change mask
        var subscription = control.Subscribe(OnControlChanged, changeMask);
        _subscriptions[control] = subscription;
    }

    // 2. Remove subscriptions for no-longer-tracked controls
    var toRemove = _subscriptions.Keys
        .Where(c => !_trackedAccess.ContainsKey(c))
        .ToList();
    foreach (var control in toRemove)
    {
        _subscriptions[control].Dispose();
        _subscriptions.Remove(control);
    }

    // 3. Clear tracked access for next evaluation
    _trackedAccess.Clear();
}
```

**Benefits**:
- **Fine-grained**: Only subscribes to accessed properties (Value, IsValid, etc.)
- **Efficient**: Only subscribes to controls actually being tracked
- **Dynamic**: Automatically adjusts subscriptions as dependencies change
- **Clean**: Removes unused subscriptions to prevent memory leaks

### 3. Change Notification

**Change Detection**: Subscribe with tracked change masks (e.g., `ControlChange.Value | ControlChange.Valid`)
**Callback Timing**: Defer callback execution until after transaction completes

```csharp
private void OnControlChanged(IControl control, ControlChange changeType, ControlEditor editor)
{
    if (_changeCallback != null)
    {
        editor.RunAfterChanges(_changeCallback);
    }
}
```

**Benefits**:
- **Batched**: Multiple control changes in a transaction trigger callback only once
- **Consistent**: Callback runs after all changes and listeners in transaction are complete
- **Safe**: Avoids re-entrancy issues during control mutations
- **Precise**: Only triggers for changes matching the subscription mask

### 4. Lifecycle Management

**IDisposable Implementation**:
```csharp
public void Dispose()
{
    // Dispose all subscriptions
    foreach (var subscription in _subscriptions.Values)
        subscription.Dispose();

    // Clear all state
    _subscriptions.Clear();
    _trackedAccess.Clear();
    _changeCallback = null;
}
```

## Usage Scenarios

### Creating Computed ITypedControl

The primary use case for `ChangeTracker` is creating computed controls that automatically update when their dependencies change.

```csharp
public static class TypedControlExtensions
{
    /// <summary>
    /// Creates a computed ITypedControl that automatically updates when dependencies change.
    /// </summary>
    public static ITypedControl<T> CreateComputed<T>(
        Func<ChangeTracker, T> computation,
        T? initialValue = default)
    {
        var tracker = new ChangeTracker();
        var control = Control.Create(initialValue);
        var editor = new ControlEditor();

        // Set up the callback that will re-evaluate and update subscriptions
        tracker.SetCallback(() => {
            var value = computation(tracker);
            editor.SetValue(control, value);
            // Update subscriptions based on what was accessed during this evaluation
            tracker.UpdateSubscriptions();
        });

        // Initial evaluation to discover dependencies
        var initialValue = computation(tracker);
        editor.SetValue(control, initialValue);

        // Establish initial subscriptions
        tracker.UpdateSubscriptions();

        return control.AsTyped<T>();
    }
}

// Example 1: Simple computed value
var firstName = Control.Create("John");
var lastName = Control.Create("Doe");

var fullName = TypedControlExtensions.CreateComputed<string>(tracker => {
    var first = tracker.Tracked(firstName.AsTyped<string>()).Value;
    var last = tracker.Tracked(lastName.AsTyped<string>()).Value;
    return $"{first} {last}";
});

// fullName.Value is now "John Doe"
// When firstName or lastName changes, fullName automatically updates

// Example 2: Computed with validation state
var email = Control.Create("test@example.com");
var phone = Control.Create("555-1234");

var hasContactInfo = TypedControlExtensions.CreateComputed<bool>(tracker => {
    var emailTracked = tracker.Tracked(email.AsTyped<string>());
    var phoneTracked = tracker.Tracked(phone.AsTyped<string>());

    return !string.IsNullOrEmpty(emailTracked.Value) ||
           !string.IsNullOrEmpty(phoneTracked.Value);
});

// hasContactInfo automatically updates when email or phone change

// Example 3: Computed from multiple property accesses
var quantity = Control.Create(5);
var price = Control.Create(10.0);
var discountForm = Control.Create(new { /* form data */ });

var total = TypedControlExtensions.CreateComputed<double>(tracker => {
    var qty = tracker.Tracked(quantity.AsTyped<int>()).Value;
    var prc = tracker.Tracked(price.AsTyped<double>()).Value;
    var formValid = tracker.Tracked(discountForm).IsValid;

    var subtotal = qty * prc;
    // Only apply discount if discount form is valid
    return formValid ? subtotal * 0.9 : subtotal;
});

// Tracker subscribes to:
// - quantity.Value changes
// - price.Value changes
// - discountForm.IsValid changes
```

**Key Benefits**:
- **Automatic Dependency Tracking**: Dependencies are discovered by what's accessed in the computation function
- **Fine-Grained Updates**: Only subscribes to the specific properties accessed (Value, IsValid, etc.)
- **Lazy Evaluation**: Computation only runs when dependencies change
- **Type Safe**: Full IntelliSense support with typed controls
- **Composable**: Computed controls can depend on other computed controls

## Performance Considerations

### 1. Subscription Overhead
- **Minimized**: Only tracked controls have subscriptions
- **Efficient Lookup**: Use `HashSet<IControl>` for O(1) tracking checks
- **Batch Updates**: Subscription changes happen in batches

### 2. Memory Management
- **Automatic Cleanup**: Unused subscriptions are removed
- **Weak References**: Not needed - explicit disposal pattern
- **GC Pressure**: Minimal allocations in hot paths

### 3. Change Notification Performance
- **Deferred Execution**: Changes batched through `ControlEditor`
- **Single Callback**: Multiple changes trigger callback only once per transaction
- **No Redundant Work**: Callback only runs when dependencies actually change

## Testing Strategy

### 1. Unit Tests
- Dependency tracking accuracy
- Subscription lifecycle management
- Change notification timing
- Memory leak prevention

### 2. Integration Tests
- Integration with ControlEditor transactions
- Complex dependency graphs
- Performance with many tracked controls

### 3. Example Scenarios
- Expression evaluator implementations
- Computed property patterns
- Conditional logic use cases