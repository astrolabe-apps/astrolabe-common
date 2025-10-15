using System.Collections;
using System.Linq.Expressions;
using System.Reflection;
using Astrolabe.Common;

namespace Astrolabe.Controls;

/// <summary>
/// Defines the behavior for controls, including how to clone values
/// and create child controls.
/// </summary>
public interface IControlBehavior
{
    /// <summary>
    /// Clones the value with the specified child controls.
    /// Used when child control values change to create a new parent value through lazy reconstruction.
    /// </summary>
    /// <remarks>
    /// The function should handle two scenarios:
    /// 1. Creating from null - when the original value is null and a child property is set
    /// 2. Cloning non-null - when the value exists and child changes need to be merged
    /// The function receives child controls (not just values) to allow access to metadata if needed.
    /// </remarks>
    T CloneWithDict<T>(T original, IDictionary<string, IControl> childControls);

    /// <summary>
    /// Clones an array/list value with the specified child controls.
    /// </summary>
    T CloneWithArray<T>(T original, IList<IControl> childControls);

    /// <summary>
    /// Creates a child control for the specified dictionary key via string indexer.
    /// Returns an undefined control if the field doesn't exist.
    /// Only handles IDictionary types - always returns Control&lt;object?&gt;.
    /// </summary>
    /// <remarks>
    /// This function is called lazily when accessing a field via string indexer.
    /// It should return Control.CreateUndefined() if the field doesn't exist or the parent is null.
    /// For typed field access with reflection support, use CreateTypedField instead.
    /// </remarks>
    IControl CreateChildField<T>(Control<T> parent, string fieldName);

    /// <summary>
    /// Creates a typed child control for the specified field using a selector expression.
    /// Uses type information from the selector to create properly typed controls.
    /// </summary>
    /// <remarks>
    /// This function is called from Field() and SubField() methods.
    /// It handles both dictionaries and records/classes via reflection.
    /// Returns a control with the correct type (IControl&lt;TField&gt;) even when parent is null.
    /// The function receives the parent Control&lt;T&gt; to access internal state like flags and initial values.
    /// </remarks>
    IControl<TField> CreateTypedField<T, T2, TField>(Control<T> parent, Expression<Func<T2, TField>> selector)
        where T2 : T;

    /// <summary>
    /// Creates a child control for the specified array/list element index.
    /// Returns null if the index is out of bounds or the value is not an array/list.
    /// </summary>
    /// <remarks>
    /// This function is called lazily when accessing an element via integer indexer.
    /// Unlike CreateChildField, this returns null (not undefined) for out-of-bounds access.
    /// The function receives the parent Control&lt;T&gt; to access internal state like flags and initial values.
    /// </remarks>
    IControl? CreateChildElement<T>(Control<T> parent, int index);

    /// <summary>
    /// Extracts the field name from an expression selector.
    /// Used by the Field() method to convert expressions like "p => p.Name" to "Name".
    /// </summary>
    /// <remarks>
    /// Should support direct member access and unary expressions (boxing).
    /// Should throw ArgumentException for unsupported expression types.
    /// </remarks>
    string GetFieldName(Expression expression);
}

/// <summary>
/// Default implementation of IControlBehavior that handles common scenarios:
/// - Dictionary-based objects (IDictionary&lt;string, object?&gt;)
/// - Records and classes (via reflection)
/// - Arrays and lists (IList)
/// </summary>
public class DefaultControlBehavior : IControlBehavior
{
    /// <summary>
    /// Singleton instance - only one needed for the entire application.
    /// </summary>
    public static readonly DefaultControlBehavior Instance = new();

    // Private constructor to enforce singleton pattern
    private DefaultControlBehavior() { }

    public T CloneWithDict<T>(T original, IDictionary<string, IControl> childControls)
    {
        // Handle null - create new instance from overrides
        if (original == null || UndefinedValue.Instance == (object?)original)
        {
            // Dictionary: create from overrides
            if (typeof(T) == typeof(IDictionary<string, object?>) || typeof(T) == typeof(object) ||
                typeof(IDictionary<string, object?>).IsAssignableFrom(typeof(T)))
            {
                var newDict = new Dictionary<string, object?>();
                foreach (var (key, value) in childControls)
                {
                    if (!value.IsUndefined)
                        newDict[key] = value.ValueObject;
                }
                return (T)(object)newDict;
            }

            // Records/classes: create using Activator then apply overrides
            var instance = Activator.CreateInstance<T>();
            if (instance is null)
                throw new InvalidOperationException($"Cannot create instance of type {typeof(T)}");
            // Only call CloneWithOverrides if T is a reference type - use reflection to avoid compile-time constraint
            if (typeof(T).IsClass && !typeof(T).IsAbstract)
            {
                return RecordExtensions.CloneWithOverrides(instance,
                    childControls.ToDictionary(x => x.Key, x => x.Value.ValueObject));
            }
            return instance;
        }

        // Handle non-null - merge with overrides
        if (original is IDictionary<string, object?> dict)
        {
            var newDict = new Dictionary<string, object?>(dict);
            foreach (var (key, value) in childControls)
            {
                if (!value.IsUndefined)
                    newDict[key] = value.ValueObject;
                else newDict.Remove(key);

            }
            return (T)(object)newDict;
        }

        var valType = original.GetType();

        // Fallback: use CloneWithOverrides for records/classes (if T is a reference type)
        if (valType is { IsClass: true, IsAbstract: false })
        {
            return RecordExtensions.CloneWithOverrides(original,
                childControls.ToDictionary(x => x.Key, x => x.Value.ValueObject));
        }

        // For value types or unsupported types, return the original
        return original;
    }

    public T CloneWithArray<T>(T original, IList<IControl> childControls)
    {
        List<object?> list = [];
        list.AddRange(childControls.Select(x => x.ValueObject));
        return (T)(object)list;
    }

    public IControl CreateChildField<T>(Control<T> parent, string fieldName)
    {
        var currentValue = parent.GetValue();
        var initialValue = parent.GetInitialValue();

        // Only inherit disabled, touched flags, not all flags
        var childFlags = parent.GetFlags() & (ControlFlags.Disabled | ControlFlags.Touched);

        // Return undefined if parent is null or not a dictionary
        if (currentValue == null || currentValue is not IDictionary<string, object?> currentDict)
            return new Control<object?>(UndefinedValue.Instance, UndefinedValue.Instance, childFlags);

        // Dictionary: get value for key
        if (!currentDict.TryGetValue(fieldName, out var value))
            return new Control<object?>(UndefinedValue.Instance, UndefinedValue.Instance, childFlags);

        // Get initial value from parent's initial value
        var initialDict = initialValue as IDictionary<string, object?>;
        var childInitialValue = initialDict?.TryGetValue(fieldName, out var iv) == true
            ? iv
            : value;

        return new Control<object?>(value, childInitialValue, childFlags);
    }

    public IControl<TField> CreateTypedField<T, T2, TField>(Control<T> parent, Expression<Func<T2, TField>> selector)
        where T2 : T
    {
        var fieldName = GetFieldName(selector);
        var currentValue = parent.GetValue();
        var initialValue = parent.GetInitialValue();

        // Only inherit disabled, touched flags, not all flags
        var childFlags = parent.GetFlags() & (ControlFlags.Disabled | ControlFlags.Touched);

        // If parent is null or undefined, create undefined control with correct type
        if (currentValue == null || UndefinedValue.Instance.Equals(currentValue))
            return Control.CreateUndefined<TField>();
        
        // Records/Classes: use reflection to get property type and value
        var propInfo = typeof(T2).GetProperty(fieldName);
        if (propInfo == null)
            return Control.CreateUndefined<TField>();

        var propValue = propInfo.GetValue(currentValue);

        // Get initial property value from parent's initial value
        var initialPropValue = initialValue != null
            ? propInfo.GetValue(initialValue)
            : propValue;

        return new Control<TField>(propValue, initialPropValue, childFlags);
    }

    public IControl? CreateChildElement<T>(Control<T> parent, int index)
    {
        var currentValue = parent.GetValue();
        var initialValue = parent.GetInitialValue();

        if (currentValue == null)
            return null;

        // Array/List: get element at index
        if (currentValue is IList currentList)
        {
            if (index < 0 || index >= currentList.Count)
                return null;

            var value = currentList[index];

            // Get initial value from parent's initial array/list
            var initialList = initialValue as IList;
            var childInitialValue = initialList != null && index < initialList.Count
                ? initialList[index]
                : value;

            // Only inherit disabled, touched, and dontClearError flags, not all flags
            var childFlags = parent.GetFlags() & (ControlFlags.Disabled | ControlFlags.Touched | ControlFlags.DontClearError);
            return new Control<object?>(value, childInitialValue, childFlags);
        }

        // Not an array/list type
        return null;
    }

    public string GetFieldName(Expression expression)
    {
        // Handle Expression<Func<T, TField>> - extract the member name
        if (expression is LambdaExpression lambda)
        {
            if (lambda.Body is MemberExpression member)
            {
                return member.Member.Name;
            }
            // Handle unary expressions (e.g., boxing conversions)
            if (lambda.Body is UnaryExpression unary && unary.Operand is MemberExpression unaryMember)
            {
                return unaryMember.Member.Name;
            }
        }

        throw new ArgumentException($"Expression must be a member access expression, got: {expression}");
    }
}