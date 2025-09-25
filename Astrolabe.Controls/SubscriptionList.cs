namespace Astrolabe.Controls;

internal class SubscriptionList
{
    private readonly List<ISubscription> _subscriptions = new();
    private ControlChange _changeState;
    private ControlChange _mask;
    public IReadOnlyList<ISubscription> Subscriptions => _subscriptions.AsReadOnly();

    public SubscriptionList(ControlChange changeState, ControlChange mask)
    {
        _changeState = changeState;
        _mask = mask;
    }

    public ISubscription Add(ChangeListenerFunc listener, ControlChange mask)
    {
        var subscription = new Subscription(listener, mask, this);
        _subscriptions.Add(subscription);
        _mask |= mask;
        return subscription;
    }

    public void Remove(ISubscription subscription)
    {
        _subscriptions.Remove(subscription);
    }

    public void RunListeners(IControl control, ControlChange current)
    {
        var nextCurrent = current & _mask;
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
        _changeState |= change & _mask;
    }
}