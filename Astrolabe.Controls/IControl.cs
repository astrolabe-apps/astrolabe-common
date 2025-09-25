namespace Astrolabe.Controls;

public interface IControl
{
    int UniqueId { get; }
    object? Value { get; }
    object? InitialValue { get; }
    bool IsDirty { get; }
    bool IsDisabled { get; }

    // Subscription methods
    ISubscription Subscribe(ChangeListenerFunc listener, ControlChange mask);
    void Unsubscribe(ISubscription subscription);
}