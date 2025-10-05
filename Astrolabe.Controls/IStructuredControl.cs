namespace Astrolabe.Controls;

/// <summary>
/// Represents a control created from a POCO/record that stores its state as a dictionary.
/// Unlike ITypedControl&lt;T&gt;, this interface does not expose Value/InitialValue directly.
/// Instead, use the Field() extension method to access individual fields.
/// </summary>
/// <typeparam name="T">The type of the original structured object</typeparam>
public interface IStructuredControl<T> where T : class
{
    int UniqueId { get; }
    bool IsDirty { get; }
    bool IsDisabled { get; }
    bool IsTouched { get; }
    bool IsValid { get; }
    bool IsUndefined { get; }
    bool HasErrors { get; }
    IReadOnlyDictionary<string, string> Errors { get; }

    /// <summary>
    /// Gets the underlying untyped control for subscription handling.
    /// The underlying control's value is a Dictionary&lt;string, object?&gt;.
    /// </summary>
    IControl UnderlyingControl { get; }
}