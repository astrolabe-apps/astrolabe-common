namespace Astrolabe.Controls;

/// <summary>
/// Provides a typed view of a control for type-safe value access.
/// Use IControl.AsTyped&lt;T&gt;() to obtain a typed view.
/// </summary>
/// <typeparam name="T">The type of the control's value</typeparam>
public interface ITypedControl<out T> : IControlProperties<T>
{
    int UniqueId { get; }

    // Subscriptions - uses same listener as IControl since you already have the typed control
    ISubscription Subscribe(ChangeListenerFunc listener, ControlChange mask);
    void Unsubscribe(ISubscription subscription);
}
