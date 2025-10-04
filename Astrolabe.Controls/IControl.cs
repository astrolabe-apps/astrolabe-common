using System.Collections;

namespace Astrolabe.Controls;

public interface IControl
{
    int UniqueId { get; }
    object? Value { get; }
    object? InitialValue { get; }
    bool IsDirty { get; }
    bool IsDisabled { get; }
    bool IsTouched { get; }

    // Type detection
    bool IsArray { get; }
    bool IsObject { get; }
    
    /// <summary>
    /// Returns true if this control has an undefined value (e.g., missing object property).
    /// </summary>
    bool IsUndefined => Value is UndefinedValue;
    int Count { get; }

    // Indexer access
    IControl? this[string propertyName] { get; }
    IControl? this[int index] { get; }

    // Collection properties
    IEnumerable<string> FieldNames { get; }
    IReadOnlyList<IControl> Elements { get; }

    // Subscription methods
    ISubscription Subscribe(ChangeListenerFunc listener, ControlChange mask);
    void Unsubscribe(ISubscription subscription);

    // Deep equality comparison for control values
    static bool IsEqual(object? left, object? right)
    {
        if (ReferenceEquals(left, right)) return true;
        if (left is null || right is null) return false;

        // UndefinedValue only equals itself (already handled by ReferenceEquals above)
        if (left is UndefinedValue || right is UndefinedValue) return false;

        // Dictionary comparison
        if (left is IDictionary<string, object> leftDict && right is IDictionary<string, object> rightDict)
        {
            return DictionaryEquals(leftDict, rightDict);
        }

        // Collection comparison (but not string or dictionary)
        if (left is ICollection leftColl && right is ICollection rightColl &&
            left is not string && right is not string &&
            left is not IDictionary<string, object> && right is not IDictionary<string, object>)
        {
            return CollectionEquals(leftColl, rightColl);
        }

        // Default equality
        return left.Equals(right);
    }

    private static bool DictionaryEquals(IDictionary<string, object> left, IDictionary<string, object> right)
    {
        if (left.Count != right.Count) return false;

        foreach (var kvp in left)
        {
            if (!right.TryGetValue(kvp.Key, out var rightValue) ||
                !IsEqual(kvp.Value, rightValue))
            {
                return false;
            }
        }
        return true;
    }

    private static bool CollectionEquals(ICollection left, ICollection right)
    {
        if (left.Count != right.Count) return false;

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