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
    public void UpdateSubscriptions(Action changedCallback);
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

// 2. Wrap controls with tracking proxies and compute result
var nameTracked = tracker.Tracked(nameControl);
var ageTracked = tracker.Tracked(ageControl);

var result = $"{nameTracked.Value} is {ageTracked.Value} years old";

// 3. Set up change callback and establish subscriptions
tracker.UpdateSubscriptions(() => {
    // Re-evaluate when any tracked properties change
    var newResult = $"{nameTracked.Value} is {ageTracked.Value} years old";

    // Update UI, cache, etc.
    Console.WriteLine(newResult);
});

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
public void UpdateSubscriptions(Action changedCallback)
{
    _changeCallback = changedCallback;

    // 1. Add or update subscriptions for tracked controls
    foreach (var (control, changeMask) in _trackedAccess)
    {
        // Unsubscribe old subscription if mask changed
        if (_subscriptions.TryGetValue(control, out var oldSub))
        {
            if (oldSub.Mask != changeMask)
            {
                oldSub.Unsubscribe();
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
        _subscriptions[control].Unsubscribe();
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
    // Unsubscribe from all controls
    foreach (var subscription in _subscriptions.Values)
        subscription.Unsubscribe();

    // Clear all state
    _subscriptions.Clear();
    _trackedAccess.Clear();
    _changeCallback = null;
}
```

## Usage Scenarios

### 1. Expression Evaluator

```csharp
public class ExpressionEvaluator<T>
{
    private readonly ChangeTracker _tracker = new();
    private readonly Func<T> _expression;
    private T _value;

    public ExpressionEvaluator(Func<T> expression)
    {
        _expression = expression;

        // Initial evaluation to discover dependencies
        _value = _expression();

        // Set up reactive updates
        _tracker.UpdateSubscriptions(() => {
            var newValue = _expression();
            if (!EqualityComparer<T>.Default.Equals(_value, newValue))
            {
                _value = newValue;
                ValueChanged?.Invoke(newValue);
            }
        });
    }

    public T Value => _value;
    public event Action<T>? ValueChanged;
}

// Usage
var xTracked = tracker.Tracked(xControl);
var yTracked = tracker.Tracked(yControl);

var evaluator = new ExpressionEvaluator<int>(() =>
    xTracked.Value + yTracked.Value
);

evaluator.ValueChanged += sum => Console.WriteLine($"Sum: {sum}");
```

### 2. Conditional UI Updates

```csharp
var tracker = new ChangeTracker();

var roleTracked = tracker.Tracked(roleControl);
var formTracked = tracker.Tracked(formControl);

// Initial evaluation
bool shouldShow = roleTracked.Value == "admin" && formTracked.IsValid;
adminPanel.Visible = shouldShow;

// Set up reactive updates
tracker.UpdateSubscriptions(() => {
    var newShouldShow = roleTracked.Value == "admin" && formTracked.IsValid;
    adminPanel.Visible = newShouldShow;
});

// Tracker now subscribes to:
// - roleControl with ControlChange.Value mask
// - formControl with ControlChange.Valid mask
```

### 3. Computed Properties

```csharp
public class ComputedProperty<T> : IDisposable
{
    private readonly ChangeTracker _tracker = new();
    private readonly Func<T> _computation;
    private T _value;

    public ComputedProperty(Func<T> computation)
    {
        _computation = computation;
        _value = _computation();

        _tracker.UpdateSubscriptions(() => {
            var newValue = _computation();
            if (!EqualityComparer<T>.Default.Equals(_value, newValue))
            {
                _value = newValue;
                ValueChanged?.Invoke(_value);
            }
        });
    }

    public T Value => _value;
    public event Action<T>? ValueChanged;
    public void Dispose() => _tracker.Dispose();
}

// Usage
var nameTracked = tracker.Tracked(nameControl);
var ageTracked = tracker.Tracked(ageControl);

var greeting = new ComputedProperty<string>(() =>
    $"{nameTracked.Value} is {ageTracked.Value} years old"
);

greeting.ValueChanged += msg => Console.WriteLine(msg);
```

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

## Alternative Designs Considered

### 1. Weak Reference Tracking
**Rejected**: Adds complexity without clear benefit. Explicit disposal is preferred.

### 2. Automatic Proxy-Based Tracking
**Rejected**: Too "magical" - violates design goal of explicit tracking.

### 3. Fluent Builder API
**Considered**: `tracker.Track(control1).Track(control2).OnChange(callback)`
**Rejected**: Current API is simpler and more aligned with expression evaluator use case.

### 4. Generic Change Types
**Considered**: Track only specific change types per control
**Deferred**: Current implementation tracks all changes for simplicity. Can be added later if needed.

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

## Future Enhancements

### 1. Change Type Filtering
Allow tracking specific change types per control:
```csharp
reader.GetValue(control, ControlChange.Value); // Only track value changes
```

### 2. Conditional Tracking
Enable/disable tracking for specific controls:
```csharp
tracker.SetEnabled(control, false); // Temporarily ignore this control
```

### 3. Debug Support
Provide visibility into tracked dependencies:
```csharp
var dependencies = tracker.GetTrackedControls(); // For debugging
```

This design provides a solid foundation for reactive expression evaluation while maintaining simplicity and performance.