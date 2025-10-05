namespace Astrolabe.Controls;

/// <summary>
/// Provides a typed view of a control for type-safe value access.
/// Use IControl.AsTyped&lt;T&gt;() to obtain a typed view.
/// </summary>
/// <typeparam name="T">The type of the control's value</typeparam>
public interface ITypedControl<out T> : IControlProperties<T>
{
    int UniqueId { get; }

    /// <summary>
    /// Gets the underlying untyped control for subscription handling.
    /// Use this to subscribe/unsubscribe to control changes.
    /// </summary>
    IControl UnderlyingControl { get; }
}
