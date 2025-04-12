namespace Astrolabe.Controls.Internal;

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