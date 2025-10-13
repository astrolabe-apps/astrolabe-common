using System.Linq.Expressions;

namespace Astrolabe.Controls;

/// <summary>
/// Defines the behavior for a Control&lt;T&gt;, including how to clone values
/// and create child controls.
/// </summary>
/// <typeparam name="T">The type of value held by the control</typeparam>
public record ControlBehavior<T>
{
    /// <summary>
    /// Clones the value with the specified property overrides.
    /// Used when child control values change to create a new parent value.
    /// </summary>
    /// <remarks>
    /// The function should handle two scenarios:
    /// 1. Creating from null - when the original value is null and a child property is set
    /// 2. Cloning non-null - when the value exists and child changes need to be merged
    /// </remarks>
    public required Func<T?, IDictionary<string, object?>, T> CloneWith { get; init; }

    /// <summary>
    /// Creates a child control for the specified field/property/key.
    /// Returns an undefined control if the field doesn't exist.
    /// </summary>
    /// <remarks>
    /// This function is called lazily when accessing a field via indexer or Field() method.
    /// It should return Control.CreateUndefined() if the field doesn't exist or the parent is null.
    /// The function receives the parent Control&lt;T&gt; to access internal state like flags and initial values.
    /// </remarks>
    public required Func<Control<T>, string, IControl> CreateChildField { get; init; }

    /// <summary>
    /// Creates a child control for the specified array/list element index.
    /// Returns null if the index is out of bounds or the value is not an array/list.
    /// </summary>
    /// <remarks>
    /// This function is called lazily when accessing an element via integer indexer.
    /// Unlike CreateChildField, this returns null (not undefined) for out-of-bounds access.
    /// The function receives the parent Control&lt;T&gt; to access internal state like flags and initial values.
    /// </remarks>
    public required Func<Control<T>, int, IControl?> CreateChildElement { get; init; }

    /// <summary>
    /// Extracts the field name from an expression selector.
    /// Used by the Field() method to convert expressions like "p => p.Name" to "Name".
    /// </summary>
    /// <remarks>
    /// Should support direct member access and unary expressions (boxing).
    /// Should throw ArgumentException for unsupported expression types.
    /// </remarks>
    public required Func<Expression, string> GetFieldName { get; init; }
}
