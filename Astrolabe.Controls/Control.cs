namespace Astrolabe.Controls;

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