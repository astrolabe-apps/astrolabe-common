# C# Subscription System Implementation Plan

## Overview

This document outlines the implementation plan for creating a C# version of the TypeScript subscription handling system from `@astrolabe/controls`. The system provides efficient event subscription and notification capabilities for form controls with change type filtering and batched updates.

## Architecture Overview

The subscription system consists of several key components that work together to provide efficient change notification:

```
Control ──┐
          ├─► Subscriptions ──► SubscriptionList[] ──► Subscription[]
          │                                         │
          └─► InternalControl                       └─► ChangeListenerFunc
```

## Core Components

### 1. Change Types (Enum)

**Purpose**: Define the types of changes that can occur on a control
**TypeScript Reference**: `ControlChange` enum

```csharp
[Flags]
public enum ControlChange
{
    None = 0,
    Valid = 1,
    Touched = 2,
    Dirty = 4,
    Disabled = 8,
    Value = 16,
    InitialValue = 32,
    Error = 64,
    All = Value | Valid | Touched | Disabled | Error | Dirty | InitialValue,
    Structure = 128,
    Validate = 256
}
```

**Key Features**:
- Uses `[Flags]` attribute for bitwise operations
- Allows combining multiple change types
- Provides `All` convenience value for common scenarios

### 2. Change Listener Delegate

**Purpose**: Define the signature for event handlers
**TypeScript Reference**: `ChangeListenerFunc<V>`

```csharp
public delegate void ChangeListenerFunc(IControl control, ControlChange changeType);
```

**Key Features**:
- Non-generic delegate for maximum flexibility
- Receives both the control instance and change type
- Matches TypeScript callback signature

### 3. Subscription Interface

**Purpose**: Represent a single subscription that can be cancelled
**TypeScript Reference**: `Subscription` type

```csharp
public interface ISubscription
{
    ControlChange Mask { get; }
    ChangeListenerFunc Listener { get; }
    void Unsubscribe();
}

internal class Subscription : ISubscription
{
    public ControlChange Mask { get; }
    public ChangeListenerFunc Listener { get; }
    internal SubscriptionList ParentList { get; }

    public Subscription(ChangeListenerFunc listener, ControlChange mask, SubscriptionList parentList)
    {
        Listener = listener;
        Mask = mask;
        ParentList = parentList;
    }

    public void Unsubscribe() => ParentList.Remove(this);
}
```

**Key Features**:
- Simple subscription with automatic cleanup through `Unsubscribe()`
- Internal reference to parent list for removal
- Direct listener storage without type conversion

### 4. Subscription List Class

**Purpose**: Manage subscriptions for a specific change mask
**TypeScript Reference**: `SubscriptionList` class

```csharp
internal class SubscriptionList
{
    private readonly List<ISubscription> _subscriptions = new();
    private ControlChange _changeState;

    public ControlChange Mask { get; }
    public IReadOnlyList<ISubscription> Subscriptions => _subscriptions.AsReadOnly();

    public SubscriptionList(ControlChange changeState, ControlChange mask)
    {
        _changeState = changeState;
        Mask = mask;
    }

    public ISubscription Add(ChangeListenerFunc listener, ControlChange mask)
    {
        var subscription = new Subscription(listener, mask, this);
        _subscriptions.Add(subscription);
        return subscription;
    }

    public void Remove(ISubscription subscription)
    {
        _subscriptions.Remove(subscription);
    }

    public void RunListeners(IControl control, ControlChange current)
    {
        var nextCurrent = current & Mask;
        var actualChange = (nextCurrent ^ _changeState);
        _changeState = nextCurrent;

        if (actualChange != ControlChange.None)
        {
            RunMatchingListeners(control, actualChange);
        }
    }

    public void RunMatchingListeners(IControl control, ControlChange mask)
    {
        foreach (var subscription in _subscriptions)
        {
            var change = subscription.Mask & mask;
            if (change != ControlChange.None)
            {
                subscription.Listener(control, change);
            }
        }
    }

    public bool CanBeAdded(ControlChange current, ControlChange mask)
    {
        return (_changeState & mask) == current;
    }

    public bool HasSubscriptions => _subscriptions.Count > 0;

    public void ApplyChange(ControlChange change)
    {
        _changeState |= change & Mask;
    }
}
```

**Key Features**:
- Manages multiple subscriptions with same change state
- Optimizes listener execution by tracking state changes
- Supports adding/removing subscriptions dynamically
- Batches notifications for efficiency

### 5. Subscriptions Manager Class

**Purpose**: Main coordinator for all subscription lists on a control
**TypeScript Reference**: `Subscriptions` class

```csharp
public class Subscriptions
{
    private readonly List<SubscriptionList> _lists = new();

    public ControlChange Mask { get; private set; } = ControlChange.None;
    public bool OnListenerList { get; set; }
    public IReadOnlyList<SubscriptionList> Lists => _lists.AsReadOnly();

    public ISubscription Subscribe(
        ChangeListenerFunc listener,
        ControlChange current,
        ControlChange mask)
    {
        var list = _lists.FirstOrDefault(x => x.CanBeAdded(current, mask));
        if (list == null)
        {
            list = new SubscriptionList(current, mask);
            _lists.Add(list);
        }

        Mask |= mask;
        return list.Add(listener, mask);
    }

    public void Unsubscribe(ISubscription subscription)
    {
        if (subscription is Subscription sub)
        {
            sub.ParentList.Remove(subscription);
        }
    }

    public bool HasSubscriptions()
    {
        return _lists.Any(list => list.HasSubscriptions);
    }

    public void RunListeners(IControl control, ControlChange current)
    {
        foreach (var list in _lists)
        {
            list.RunListeners(control, current);
        }
    }

    public void RunMatchingListeners(IControl control, ControlChange mask)
    {
        foreach (var list in _lists)
        {
            list.RunMatchingListeners(control, mask);
        }
    }

    public void ApplyChange(ControlChange change)
    {
        foreach (var list in _lists)
        {
            list.ApplyChange(change);
        }
    }
}
```

**Key Features**:
- Central hub for subscription management
- Automatically creates subscription lists as needed
- Maintains global mask of all subscribed changes
- Distributes events to appropriate subscription lists

### 6. Control Interface Integration

**Purpose**: Define how controls interact with the subscription system
**TypeScript Reference**: `Control<V>` interface

```csharp
public interface IControl
{
    int UniqueId { get; }
    object? Value { get; set; }

    // Subscription methods
    ISubscription Subscribe(ChangeListenerFunc listener, ControlChange mask);
    void Unsubscribe(ISubscription subscription);

    // Internal subscription access
    internal Subscriptions? InternalSubscriptions { get; }
}

public class Control : IControl
{
    private static int _nextId = 1;
    private object? _value;

    public int UniqueId { get; } = Interlocked.Increment(ref _nextId);

    public virtual object? Value
    {
        get => _value;
        set
        {
            if (!Equals(_value, value))
            {
                _value = value;
                NotifyChange(ControlChange.Value);
            }
        }
    }

    private Subscriptions? _subscriptions;
    Subscriptions? IControl.InternalSubscriptions => _subscriptions;

    public Control(object? initialValue = null)
    {
        _value = initialValue;
    }

    public ISubscription Subscribe(ChangeListenerFunc listener, ControlChange mask)
    {
        _subscriptions ??= new Subscriptions();
        return _subscriptions.Subscribe(listener, GetCurrentState(), mask);
    }

    public void Unsubscribe(ISubscription subscription)
    {
        _subscriptions?.Unsubscribe(subscription);
    }

    protected virtual ControlChange GetCurrentState()
    {
        // For basic implementation, assume all states are "normal"
        return ControlChange.None;
    }

    protected void NotifyChange(ControlChange changeType)
    {
        _subscriptions?.RunListeners(this, changeType);
    }
}

```

**Key Features**:
- Non-generic base interface for maximum flexibility
- Concrete implementation with constructor for easy instantiation
- Automatic change notification when value changes
- Lazy initialization of subscription system
- Thread-safe unique ID generation
- Virtual methods allowing customization in derived classes

## Implementation Strategy

### Phase 1: Core Infrastructure
1. **Define base types**: `ControlChange`, `ChangeListenerFunc`
2. **Implement subscription classes**: `ISubscription`, `Subscription`
3. **Create subscription list**: `SubscriptionList`
4. **Build subscription manager**: `Subscriptions`

### Phase 2: Control Integration
1. **Define control interfaces**: `IControl` (non-generic)
2. **Create base control class**: `Control`
3. **Implement notification system**: `NotifyChange` method
4. **Add subscription management**: `Subscribe`/`Unsubscribe` methods

### Phase 3: Advanced Features
1. **Subscription tracking**: For debugging and metrics
2. **Cleanup utilities**: Bulk unsubscribe, disposal patterns
3. **Performance optimization**: Memory pooling, allocation reduction
4. **Event batching**: Group multiple changes into single notifications

### Phase 4: Testing & Validation
1. **Unit tests**: Core subscription functionality
2. **Performance tests**: Memory usage, notification speed
3. **Integration tests**: With actual control implementations
4. **Debugging tools**: Subscription inspection, metrics collection

## Key Design Considerations

### Type Safety
- Use generic constraints throughout the system
- Maintain type information in subscription chains
- Provide compile-time safety for event handlers

### Performance
- Minimize allocations during subscription/notification
- Use efficient data structures (List<T>, HashSet<T>)
- Implement subscription pooling for high-frequency scenarios
- Batch notifications to reduce event handler calls

### Memory Management
- Implement proper disposal patterns
- Provide cleanup mechanisms for long-lived controls
- Consider weak references for parent-child relationships
- Support bulk unsubscribe operations

### Thread Safety
- Consider concurrent access patterns
- Use appropriate locking mechanisms
- Provide thread-safe subscription operations
- Handle cross-thread notifications safely

### Debugging & Diagnostics
- Include subscription count tracking
- Provide inspection APIs for debugging
- Support subscription leak detection
- Enable performance monitoring hooks

## API Examples

### Basic Subscription
```csharp
var control = new Control("Hello World");
var subscription = control.Subscribe(
    (ctrl, change) => Console.WriteLine($"Control {ctrl.UniqueId} changed: {change}"),
    ControlChange.Value | ControlChange.Valid
);

// Later...
subscription.Unsubscribe();
```

### Advanced Usage
```csharp
var control = new Control(42);

// Subscribe to all changes
var allChanges = control.Subscribe(
    (ctrl, change) => UpdateUI(ctrl, change),
    ControlChange.All
);

// Subscribe to specific changes
var valueOnly = control.Subscribe(
    (ctrl, change) => ValidateValue(ctrl.Value),
    ControlChange.Value
);

// Value changes trigger notifications
control.Value = 100; // This will notify valueOnly and allChanges subscribers

// Cleanup when done
using var cleanup = new CompositeDisposable(allChanges, valueOnly);
```

## Migration Notes from TypeScript

### Key Differences
1. **Delegates vs Functions**: C# uses strongly-typed delegates instead of function types
2. **Generics**: C# generics provide better type safety than TypeScript generics
3. **Memory Management**: Explicit disposal patterns vs garbage collection
4. **Null Safety**: Nullable reference types provide similar safety to TypeScript's strict null checks

### Compatibility Considerations
- Maintain similar API surface for easy migration
- Preserve subscription semantics and behavior
- Support similar debugging capabilities
- Keep performance characteristics comparable

## Next Steps

1. **Review and approve this plan**
2. **Set up basic project structure**
3. **Implement Phase 1 components**
4. **Create initial unit tests**
5. **Build simple control example**
6. **Iterate based on feedback**

This plan provides a solid foundation for implementing a robust, type-safe subscription system in C# that maintains the efficiency and flexibility of the original TypeScript implementation while leveraging C#'s strengths in type safety and performance.