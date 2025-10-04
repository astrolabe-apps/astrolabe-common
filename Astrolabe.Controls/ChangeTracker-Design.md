# ChangeTracker Design Document

## Overview

The `ChangeTracker` provides automatic dependency tracking for expression evaluators in the C# version of `@astroapps/forms-core`. It allows code to explicitly track which controls are accessed during computation and automatically re-execute when any of those controls change.

## Design Goals

1. **Support Expression Evaluators**: Enable reactive computations that depend on multiple controls
2. **Explicit Tracking**: No "magic" - controls are tracked when explicitly accessed through `IControlReader`
3. **Simple API**: Minimal surface area focused on the core use case
4. **Performance**: Efficient subscription management and change batching
5. **Thread Safety**: Safe for concurrent access
6. **Lifecycle Management**: Proper cleanup of subscriptions

## Architecture

### Core Classes

```csharp
public class ChangeTracker : IDisposable
{
    public T TrackChanges<T>(Func<IControlReader, T> readControls);
    public void UpdateSubscriptions(Action changedCallback);
    public void Dispose();
}

public interface IControlReader
{
    object? GetValue(IControl control);
    object? GetInitialValue(IControl control);
    bool IsDirty(IControl control);
    bool IsValid(IControl control);
    bool IsTouched(IControl control);
    bool IsDisabled(IControl control);
    IReadOnlyDictionary<string, string> GetErrors(IControl control);
}
```

### Usage Pattern

```csharp
// 1. Create tracker
var tracker = new ChangeTracker();

// 2. Define computation that tracks dependencies
var result = tracker.TrackChanges(reader => {
    var name = reader.GetValue(nameControl) as string;
    var age = reader.GetValue(ageControl) as int?;
    return $"{name} is {age} years old";
});

// 3. Set up change callback and establish subscriptions
tracker.UpdateSubscriptions(() => {
    // Re-evaluate when any tracked control changes
    var newResult = tracker.TrackChanges(reader => {
        var name = reader.GetValue(nameControl) as string;
        var age = reader.GetValue(ageControl) as int?;
        return $"{name} is {age} years old";
    });

    // Update UI, cache, etc.
    Console.WriteLine(newResult);
});
```

## Detailed Design

### 1. Dependency Tracking Mechanism

**Approach**: Track controls when they are accessed through `IControlReader` methods.

```csharp
internal class ControlReader : IControlReader
{
    private readonly ChangeTracker _tracker;

    public object? GetValue(IControl control)
    {
        _tracker.TrackControl(control);  // Register dependency
        return control.Value;            // Return actual value
    }

    // Similar for other properties...
}
```

**Benefits**:
- Explicit tracking - only accessed controls are monitored
- Automatic cleanup - unused controls are automatically untracked
- Flexible - works with any control access pattern

### 2. Subscription Management

**Current Tracked Controls**: `HashSet<IControl> _trackedControls`
**Active Subscriptions**: `List<ISubscription> _subscriptions`

**Algorithm**:
```csharp
public void UpdateSubscriptions(Action changedCallback)
{
    // 1. Add subscriptions for newly tracked controls
    foreach (var control in _trackedControls)
    {
        if (!HasSubscription(control))
        {
            var subscription = control.Subscribe(OnControlChanged, ControlChange.All);
            _subscriptions.Add(new ControlSubscription(control, subscription));
        }
    }

    // 2. Remove subscriptions for no-longer-tracked controls
    var toRemove = _subscriptions.Where(s => !_trackedControls.Contains(s.Control));
    foreach (var sub in toRemove)
    {
        sub.Subscription.Unsubscribe();
        _subscriptions.Remove(sub);
    }
}
```

**Benefits**:
- Efficient: Only subscribes to controls actually being tracked
- Dynamic: Automatically adjusts subscriptions as dependencies change
- Clean: Removes unused subscriptions to prevent memory leaks

### 3. Change Notification

**Change Detection**: Subscribe to `ControlChange.All` on tracked controls
**Callback Timing**: Use `ControlEditor.RunAfterChanges()` to defer callback until after transaction

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
- **Consistent**: Callback runs after all changes in transaction are complete
- **Safe**: Avoids re-entrancy issues during control mutations

### 4. Thread Safety

**Locking Strategy**: Single lock (`_lock`) protects all mutable state
**Critical Sections**:
- Adding/removing tracked controls
- Adding/removing subscriptions
- Setting change callback

```csharp
private readonly object _lock = new();

public void UpdateSubscriptions(Action changedCallback)
{
    lock (_lock)
    {
        // All subscription management here
    }
}
```

### 5. Lifecycle Management

**IDisposable Implementation**:
```csharp
public void Dispose()
{
    lock (_lock)
    {
        // Unsubscribe from all controls
        foreach (var subscription in _subscriptions)
            subscription.Unsubscribe();

        // Clear all state
        _subscriptions.Clear();
        _trackedControls.Clear();
        _changeCallback = null;
    }
}
```

## Usage Scenarios

### 1. Expression Evaluator

```csharp
public class ExpressionEvaluator
{
    private readonly ChangeTracker _tracker = new();
    private readonly Func<IControlReader, object> _expression;

    public ExpressionEvaluator(Func<IControlReader, object> expression)
    {
        _expression = expression;

        // Initial evaluation to discover dependencies
        var result = _tracker.TrackChanges(_expression);

        // Set up reactive updates
        _tracker.UpdateSubscriptions(() => {
            var newResult = _tracker.TrackChanges(_expression);
            OnResultChanged?.Invoke(newResult);
        });
    }

    public event Action<object>? OnResultChanged;
}

// Usage
var evaluator = new ExpressionEvaluator(reader => {
    var x = (int)reader.GetValue(xControl);
    var y = (int)reader.GetValue(yControl);
    return x + y;
});

evaluator.OnResultChanged += result => Console.WriteLine($"Sum: {result}");
```

### 2. Conditional UI Updates

```csharp
var tracker = new ChangeTracker();

// Track visibility condition
bool shouldShow = tracker.TrackChanges(reader => {
    var userRole = reader.GetValue(roleControl) as string;
    var isValid = reader.IsValid(formControl);
    return userRole == "admin" && isValid;
});

tracker.UpdateSubscriptions(() => {
    var newShouldShow = tracker.TrackChanges(reader => {
        var userRole = reader.GetValue(roleControl) as string;
        var isValid = reader.IsValid(formControl);
        return userRole == "admin" && isValid;
    });

    adminPanel.Visible = newShouldShow;
});
```

### 3. Computed Properties

```csharp
public class ComputedProperty<T> : IDisposable
{
    private readonly ChangeTracker _tracker = new();
    private T _value;

    public ComputedProperty(Func<IControlReader, T> computation)
    {
        _value = _tracker.TrackChanges(computation);

        _tracker.UpdateSubscriptions(() => {
            var newValue = _tracker.TrackChanges(computation);
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
- Thread safety under concurrent access
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