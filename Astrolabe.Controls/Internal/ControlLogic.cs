using System;
using System.Collections.Generic;

namespace Astrolabe.Controls.Internal;


/// <summary>
/// Flags representing the state of a control.
/// </summary>
[Flags]
internal enum ControlFlags
{
    None = 0,
    Touched = 1,
    Disabled = 2,
    ChildInvalid = 4,
    DontClearError = 8
}

/// <summary>
/// Represents a link to a parent control.
/// </summary>
internal class ParentLink
{
    /// <summary>
    /// The parent control.
    /// </summary>
    public ControlImpl Control { get; set; }
    
    /// <summary>
    /// The key or index in the parent.
    /// </summary>
    public object Key { get; set; }
    
    /// <summary>
    /// The original key or index in the parent, if different.
    /// </summary>
    public object? OrigKey { get; set; }

    public ParentLink(ControlImpl control, object key, object? origKey = null)
    {
        Control = control;
        Key = key;
        OrigKey = origKey;
    }
}

/// <summary>
/// Base class for control logic implementations.
/// </summary>
internal abstract class ControlLogic
{
    /// <summary>
    /// Function to determine if two values are equal.
    /// </summary>
    public Func<object?, object?, bool> IsEqual { get; }

    protected ControlLogic(Func<object?, object?, bool> isEqual)
    {
        IsEqual = isEqual;
    }


    /// <summary>
    /// Executes an action on each child control.
    /// </summary>
    /// <param name="control"></param>
    /// <param name="action">The action to execute.</param>
    public abstract void WithChildren(ControlImpl control, Action<ControlImpl> action);

    /// <summary>
    /// Gets a child field by name.
    /// </summary>
    /// <param name="control"></param>
    /// <param name="propertyName">The name of the field.</param>
    /// <returns>The internal control for the field.</returns>
    public abstract ControlImpl GetField(ControlImpl control, string propertyName);

    /// <summary>
    /// Ensures that this control is in object mode.
    /// </summary>
    /// <returns>A control logic for object mode.</returns>
    public abstract ControlLogic EnsureObject(ControlImpl control);

    /// <summary>
    /// Ensures that this control is in array mode.
    /// </summary>
    /// <returns>A control logic for array mode.</returns>
    public abstract ControlLogic EnsureArray(ControlImpl control);

    /// <summary>
    /// Gets the elements of this control as an array.
    /// </summary>
    /// <returns>An array of internal controls.</returns>
    public abstract IReadOnlyList<ControlImpl> GetElements(ControlImpl control);

    /// <summary>
    /// Called when the initial value of the control has changed.
    /// </summary>
    public virtual void InitialValueChanged(IControlTransactions ctx, ControlImpl control) { }

    /// <summary>
    /// Called when the value of the control has changed.
    /// </summary>
    public virtual void ValueChanged(IControlTransactions ctx, ControlImpl control) { }

    /// <summary>
    /// Called when a child control's value has changed.
    /// </summary>
    /// <param name="ctx"></param>
    /// <param name="control"></param>
    /// <param name="prop">The property or index that changed.</param>
    /// <param name="value">The new value.</param>
    public virtual void ChildValueChange(IControlTransactions ctx, ControlImpl control, object prop, object? value)
    {
        throw new InvalidOperationException("Should never get here");
    }

    /// <summary>
    /// Determines if all children are valid.
    /// </summary>
    /// <returns>True if all children are valid; otherwise, false.</returns>
    public virtual bool ChildrenValid()
    {
        return true;
    }
}

/// <summary>
/// Manages subscriptions to control changes.
/// </summary>
internal class Subscriptions
{
    private List<SubscriptionList> _lists = new();
    public ControlChange Mask { get; private set; } = ControlChange.None;

    /// <summary>
    /// Subscribes to changes in a control.
    /// </summary>
    /// <param name="listener">The listener function.</param>
    /// <param name="current">The current state.</param>
    /// <param name="mask">The types of changes to listen for.</param>
    /// <returns>A subscription that can be used to unsubscribe.</returns>
    public ISubscription Subscribe(ChangeListenerFunc listener, ControlChange current, ControlChange mask)
    {
        var list = _lists.Find(x => x.CanBeAdded(current, mask));
        if (list == null)
        {
            list = new SubscriptionList(current, mask);
            _lists.Add(list);
        }
        
        Mask |= mask;
        return list.Add(listener, mask);
    }

    /// <summary>
    /// Unsubscribes from changes in a control.
    /// </summary>
    /// <param name="subscription">The subscription to cancel.</param>
    public void Unsubscribe(ISubscription subscription)
    {
        var internalSub = (SubscriptionInternal)subscription;
        internalSub.List.Remove(subscription);
    }

    /// <summary>
    /// Runs all listeners with the current state.
    /// </summary>
    /// <param name="control">The control that changed.</param>
    /// <param name="current">The current state.</param>
    public void RunListeners(IControl control, ControlChange current)
    {
        foreach (var list in _lists)
        {
            list.RunListeners(control, current);
        }
    }

    /// <summary>
    /// Runs listeners that match a specific mask.
    /// </summary>
    /// <param name="control">The control that changed.</param>
    /// <param name="mask">The types of changes.</param>
    public void RunMatchingListeners(IControl control, ControlChange mask)
    {
        foreach (var list in _lists)
        {
            list.RunMatchingListeners(control, mask);
        }
    }

    /// <summary>
    /// Applies a change to all subscription lists.
    /// </summary>
    /// <param name="change">The change to apply.</param>
    public void ApplyChange(ControlChange change)
    {
        foreach (var list in _lists)
        {
            list.ApplyChange(change);
        }
    }
}

/// <summary>
/// Internal subscription that includes a reference to its list.
/// </summary>
internal interface SubscriptionInternal : ISubscription
{
    /// <summary>
    /// The list this subscription belongs to.
    /// </summary>
    SubscriptionList List { get; }
}

/// <summary>
/// Manages a list of subscriptions with the same state.
/// </summary>
internal class SubscriptionList
{
    private List<ISubscription> _subscriptions = new();
    private ControlChange _changeState;
    private ControlChange _mask;

    public SubscriptionList(ControlChange changeState, ControlChange mask)
    {
        _changeState = changeState;
        _mask = mask;
    }

    /// <summary>
    /// Removes a subscription from this list.
    /// </summary>
    /// <param name="subscription">The subscription to remove.</param>
    public void Remove(ISubscription subscription)
    {
        _subscriptions.Remove(subscription);
    }

    /// <summary>
    /// Runs listeners that match a specific mask.
    /// </summary>
    /// <param name="control">The control that changed.</param>
    /// <param name="mask">The types of changes.</param>
    public void RunMatchingListeners(IControl control, ControlChange mask)
    {
        foreach (var sub in _subscriptions)
        {
            var change = sub.Mask & mask;
            if (change != ControlChange.None)
            {
                sub.Listener(control, change);
            }
        }
    }

    /// <summary>
    /// Runs all listeners with the current state.
    /// </summary>
    /// <param name="control">The control that changed.</param>
    /// <param name="current">The current state.</param>
    public void RunListeners(IControl control, ControlChange current)
    {
        var nextCurrent = current & _mask;
        var actualChange = nextCurrent ^ _changeState;
        _changeState = nextCurrent;
        
        if (actualChange != ControlChange.None)
        {
            RunMatchingListeners(control, actualChange);
        }
    }

    /// <summary>
    /// Applies a change to this list.
    /// </summary>
    /// <param name="change">The change to apply.</param>
    public void ApplyChange(ControlChange change)
    {
        _changeState |= change & _mask;
    }

    /// <summary>
    /// Adds a new subscription to this list.
    /// </summary>
    /// <param name="listener">The listener function.</param>
    /// <param name="mask">The types of changes to listen for.</param>
    /// <returns>A subscription that can be used to unsubscribe.</returns>
    public ISubscription Add(ChangeListenerFunc listener, ControlChange mask)
    {
        var sub = new SubscriptionInternalImpl
        {
            List = this,
            Mask = mask,
            Listener = listener
        };
        
        _mask |= mask;
        _subscriptions.Add(sub);
        return sub;
    }

    /// <summary>
    /// Determines if a subscription can be added to this list.
    /// </summary>
    /// <param name="current">The current state.</param>
    /// <param name="mask">The types of changes to listen for.</param>
    /// <returns>True if the subscription can be added; otherwise, false.</returns>
    public bool CanBeAdded(ControlChange current, ControlChange mask)
    {
        return (_changeState & mask) == current;
    }

    private class SubscriptionInternalImpl : SubscriptionInternal
    {
        public SubscriptionList List { get; set; } = null!;
        public ControlChange Mask { get; set; }
        public ChangeListenerFunc Listener { get; set; } = null!;
    }
}