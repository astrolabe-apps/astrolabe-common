namespace Astrolabe.Controls;

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