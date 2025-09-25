namespace Astrolabe.Controls;

public class Control : IControl, IControlMutation
{
    private static int _nextId = 1;
    private object? _value;
    private object? _initialValue;
    private ControlFlags _flags;

    public int UniqueId { get; } = Interlocked.Increment(ref _nextId);

    public object? Value => _value;
    public object? InitialValue => _initialValue;
    public bool IsDirty => !Equals(_value, _initialValue);
    public bool IsDisabled => (_flags & ControlFlags.Disabled) != 0;

    private Subscriptions? _subscriptions;
    public Control(object? initialValue = null)
    {
        _value = initialValue;
        _initialValue = initialValue;
        _flags = 0;
    }

    public ISubscription Subscribe(ChangeListenerFunc listener, ControlChange mask)
    {
        _subscriptions ??= new Subscriptions();
        return _subscriptions.Subscribe(listener, GetChangeState(mask), mask);
    }

    public void Unsubscribe(ISubscription subscription)
    {
        _subscriptions?.Unsubscribe(subscription);
    }

    protected ControlChange GetChangeState(ControlChange mask)
    {
        ControlChange changeFlags = ControlChange.None;

        if ((mask & ControlChange.Dirty) != 0 && IsDirty)
            changeFlags |= ControlChange.Dirty;
        if ((mask & ControlChange.Disabled) != 0 && IsDisabled)
            changeFlags |= ControlChange.Disabled;
        // TODO: Add other state flags like Valid, Touched when implemented

        return changeFlags;
    }

    // Internal mutation interface implementation
    bool IControlMutation.SetValueInternal(ControlEditor editor, object? value)
    {
        if (!Equals(_value, value))
        {
            _value = value;
            _subscriptions?.ApplyChange(ControlChange.Value);
            return true;
        }
        return false;
    }

    bool IControlMutation.SetInitialValueInternal(ControlEditor editor, object? initialValue)
    {
        if (!Equals(_initialValue, initialValue))
        {
            _initialValue = initialValue;
            _subscriptions?.ApplyChange(ControlChange.InitialValue);
            return true;
        }
        return false;
    }

    bool IControlMutation.SetDisabledInternal(ControlEditor editor, bool disabled)
    {
        if (disabled == IsDisabled) return false;
        if (disabled) _flags |= ControlFlags.Disabled;
        else _flags &= ~ControlFlags.Disabled;
        return true;
    }
    
    void IControlMutation.RunListeners()
    {
        var s = _subscriptions;
        if (s != null)
        {
            var currentState = GetChangeState(s.Mask);
            s.RunListeners(this, currentState);
        }
    }
}

[Flags]
public enum ControlFlags
{
    Disabled = 1
}