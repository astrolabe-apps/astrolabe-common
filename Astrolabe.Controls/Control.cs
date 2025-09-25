namespace Astrolabe.Controls;

public class Control : IControl, IControlMutation
{
    private static int _nextId = 1;
    private object? _value;

    public int UniqueId { get; } = Interlocked.Increment(ref _nextId);

    public virtual object? Value => _value;

    private Subscriptions? _subscriptions;
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

    protected virtual ControlChange GetChangeState(ControlChange mask)
    {
        // Return None - ApplyChange will handle tracking changes in subscription lists
        return ControlChange.None;
    }

    // Internal mutation interface implementation
    bool IControlMutation.SetValueInternal(object? value)
    {
        if (!Equals(_value, value))
        {
            _value = value;
            _subscriptions?.ApplyChange(ControlChange.Value);
            return true;
        }
        return false;
    }
    
    void IControlMutation.RunListeners()
    {
        var s = _subscriptions;
        if (s != null)
        {
            var currentChanges = GetChangeState(s.Mask);
            s.RunListeners(this, currentChanges);
        }
    }

    protected void NotifyChange(ControlChange changeType)
    {
        _subscriptions?.RunListeners(this, changeType);
    }
}