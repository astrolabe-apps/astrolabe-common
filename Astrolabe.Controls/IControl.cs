using System.Collections;
using System.Linq.Expressions;

namespace Astrolabe.Controls;

public interface IControl
{
    // Properties from IControlProperties (now using object?)
    object? ValueObject { get; }
    object? InitialValueObject { get; }
    bool IsDirty { get; }
    bool IsDisabled { get; }
    bool IsTouched { get; }
    bool IsValid { get; }
    IReadOnlyDictionary<string, string> Errors { get; }

    /// <summary>
    /// Returns true if this control has an undefined value (e.g., missing object property).
    /// </summary>
    bool IsUndefined { get; }

    bool HasErrors { get; }

    int UniqueId { get; }

    // Type detection
    bool IsArray { get; }
    bool IsObject { get; }

    int Count { get; }

    // Indexer access
    IControl this[string propertyName] { get; }
    IControl? this[int index] { get; }

    // Collection properties
    IEnumerable<string> FieldNames { get; }
    IReadOnlyList<IControl> Elements { get; }

    // Subscription method on IControl for convenience
    ISubscription Subscribe(ChangeListenerFunc listener, ControlChange mask);

    // Deep equality comparison for control values
    static bool IsEqual(object? left, object? right)
    {
        if (ReferenceEquals(left, right))
            return true;
        if (left is null || right is null)
            return false;

        // UndefinedValue only equals itself (already handled by ReferenceEquals above)
        if (left is UndefinedValue || right is UndefinedValue)
            return false;

        // Dictionary comparison
        if (
            left is IDictionary<string, object> leftDict
            && right is IDictionary<string, object> rightDict
        )
        {
            return DictionaryEquals(leftDict, rightDict);
        }

        // Collection comparison (but not string or dictionary)
        if (
            left is ICollection leftColl
            && right is ICollection rightColl
            && left is not string
            && right is not string
            && left is not IDictionary<string, object>
            && right is not IDictionary<string, object>
        )
        {
            return CollectionEquals(leftColl, rightColl);
        }

        // Default equality
        return left.Equals(right);
    }

    private static bool DictionaryEquals(
        IDictionary<string, object> left,
        IDictionary<string, object> right
    )
    {
        if (left.Count != right.Count)
            return false;

        foreach (var kvp in left)
        {
            if (!right.TryGetValue(kvp.Key, out var rightValue) || !IsEqual(kvp.Value, rightValue))
            {
                return false;
            }
        }
        return true;
    }

    private static bool CollectionEquals(ICollection left, ICollection right)
    {
        if (left.Count != right.Count)
            return false;

        var leftArray = left.Cast<object?>().ToArray();
        var rightArray = right.Cast<object?>().ToArray();

        for (int i = 0; i < leftArray.Length; i++)
        {
            if (!IsEqual(leftArray[i], rightArray[i]))
                return false;
        }
        return true;
    }
}

/// <summary>
/// Generic version of IControl that provides type-safe access to control values.
/// </summary>
/// <typeparam name="T">The type of value held by this control</typeparam>
public interface IControl<T> : IControl
{
    /// <summary>
    /// Gets the current typed value of this control.
    /// </summary>
    T Value { get; }

    /// <summary>
    /// Gets the initial typed value of this control.
    /// </summary>
    T InitialValue { get; }

    /// <summary>
    /// Gets a typed child control for the specified field using an expression selector.
    /// This provides compile-time type safety for field access.
    /// Returns an undefined control if the field doesn't exist, enabling safe chaining.
    /// </summary>
    /// <typeparam name="TField">The type of the field</typeparam>
    /// <param name="selector">Expression that selects the field (e.g., p => p.Name)</param>
    /// <returns>A typed control for the field</returns>
    IControl<TField> Field<TField>(Expression<Func<T, TField>> selector);

    IControl<TField> SubField<T2, TField>(Expression<Func<T2, TField>> selector) where T2 : T;

    /// <summary>
    /// Checks if a field control has already been created for the specified field.
    /// This allows checking for control existence without creating one.
    /// </summary>
    /// <typeparam name="TField">The type of the field</typeparam>
    /// <param name="selector">Expression that selects the field (e.g., p => p.Name)</param>
    /// <returns>True if a control exists for the field; otherwise, false</returns>
    bool HaveField<TField>(Expression<Func<T, TField>> selector);
}
