using System;
using System.Collections.Generic;

namespace Astrolabe.Controls.Internal;

/// <summary>
/// Represents the internal control interface which extends IControl with implementation-specific methods and properties.
/// </summary>
internal interface IInternalControl : IControl
{
    /// <summary>
    /// Gets or sets the flags for this control.
    /// </summary>
    ControlFlags Flags { get; set; }
    
    /// <summary>
    /// Gets the subscriptions manager for this control.
    /// </summary>
    Subscriptions? Subscriptions { get; }
    
    /// <summary>
    /// Gets the control logic for this control.
    /// </summary>
    ControlLogic Logic { get; }
    
    /// <summary>
    /// Gets the list of parent links.
    /// </summary>
    IList<ParentLink>? Parents { get; }
    
    /// <summary>
    /// Determines if the control is valid.
    /// </summary>
    /// <returns>True if the control is valid; otherwise, false.</returns>
    bool IsValid();
    
    /// <summary>
    /// Gets a field by property name.
    /// </summary>
    /// <param name="propertyName">The name of the property to get.</param>
    /// <returns>The internal control for the field.</returns>
    IInternalControl GetField(string propertyName);
    
    /// <summary>
    /// Sets the value of the control without triggering validation.
    /// </summary>
    /// <param name="value">The new value.</param>
    /// <param name="from">The parent control that triggered this change, if any.</param>
    void SetValueImpl(object? value, IInternalControl? from = null);
    
    /// <summary>
    /// Sets the initial value of the control.
    /// </summary>
    /// <param name="value">The new initial value.</param>
    void SetInitialValueImpl(object? value);
    
    /// <summary>
    /// Runs all subscribed listeners for current state.
    /// </summary>
    void RunListeners();
    
    /// <summary>
    /// Notifies parent controls that the validity of this control has changed.
    /// </summary>
    /// <param name="hasErrors">Whether this control now has errors.</param>
    void ValidityChanged(bool hasErrors);
    
    /// <summary>
    /// Updates or creates a link to a parent control.
    /// </summary>
    /// <param name="parent">The parent control.</param>
    /// <param name="key">The key or index in the parent.</param>
    /// <param name="initial">If true, also sets the original key.</param>
    void UpdateParentLink(IInternalControl parent, object? key, bool initial = false);
}

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
    public IInternalControl Control { get; set; }
    
    /// <summary>
    /// The key or index in the parent.
    /// </summary>
    public object Key { get; set; }
    
    /// <summary>
    /// The original key or index in the parent, if different.
    /// </summary>
    public object? OrigKey { get; set; }

    public ParentLink(IInternalControl control, object key, object? origKey = null)
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
    /// The control this logic is attached to.
    /// </summary>
    public IInternalControl Control { get; protected set; } = null!;

    /// <summary>
    /// Function to determine if two values are equal.
    /// </summary>
    public Func<object?, object?, bool> IsEqual { get; }

    protected ControlLogic(Func<object?, object?, bool> isEqual)
    {
        IsEqual = isEqual;
    }

    /// <summary>
    /// Attaches this logic to a control.
    /// </summary>
    /// <param name="control">The control to attach to.</param>
    /// <returns>This logic instance.</returns>
    public virtual ControlLogic Attach(IInternalControl control)
    {
        Control = control;
        return this;
    }

    /// <summary>
    /// Executes an action on each child control.
    /// </summary>
    /// <param name="action">The action to execute.</param>
    public abstract void WithChildren(Action<IInternalControl> action);

    /// <summary>
    /// Gets a child field by name.
    /// </summary>
    /// <param name="propertyName">The name of the field.</param>
    /// <returns>The internal control for the field.</returns>
    public abstract IInternalControl GetField(string propertyName);

    /// <summary>
    /// Ensures that this control is in object mode.
    /// </summary>
    /// <returns>A control logic for object mode.</returns>
    public abstract ControlLogic EnsureObject();

    /// <summary>
    /// Ensures that this control is in array mode.
    /// </summary>
    /// <returns>A control logic for array mode.</returns>
    public abstract ControlLogic EnsureArray();

    /// <summary>
    /// Gets the elements of this control as an array.
    /// </summary>
    /// <returns>An array of internal controls.</returns>
    public abstract IReadOnlyList<IInternalControl> GetElements();

    /// <summary>
    /// Called when the initial value of the control has changed.
    /// </summary>
    public virtual void InitialValueChanged() { }

    /// <summary>
    /// Called when the value of the control has changed.
    /// </summary>
    public virtual void ValueChanged() { }

    /// <summary>
    /// Called when a child control's value has changed.
    /// </summary>
    /// <param name="prop">The property or index that changed.</param>
    /// <param name="value">The new value.</param>
    public virtual void ChildValueChange(object prop, object? value)
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
    public bool OnListenerList { get; set; } = false;

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