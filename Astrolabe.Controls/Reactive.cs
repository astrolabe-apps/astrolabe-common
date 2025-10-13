using System.Linq.Expressions;

namespace Astrolabe.Controls;

/// <summary>
/// Provides a reactive wrapper around an object of type T with expression-based property access and control caching.
/// </summary>
/// <typeparam name="T">The type of the underlying object.</typeparam>
public class Reactive<T> : IReactive<T>
{
    private readonly T _instance;
    private readonly Dictionary<string, IControl> _controlCache = new();
    private readonly Dictionary<string, object> _reactiveCache = new();
    private readonly Dictionary<string, Delegate> _compiledAccessors = new();

    /// <summary>
    /// Creates a new reactive wrapper around an instance.
    /// </summary>
    /// <param name="instance">The instance to wrap.</param>
    public Reactive(T instance)
    {
        _instance = instance;
    }

    public T2 Get<T2>(Expression<Func<T, T2>> selector)
    {
        // Only support single-level property access (consistent with GetControl/HaveControl)
        var propertyName = GetSinglePropertyName(selector, nameof(Get));

        // Check if a control exists for this property
        if (_controlCache.TryGetValue(propertyName, out var control))
        {
            // Return the control's value (which may be computed)
            return (T2)control.Value!;
        }

        // Fall back to instance value if no control exists
        var accessor = GetOrCompileAccessor(selector);
        return ((Func<T, T2>)accessor)(_instance);
    }

    public IReactive<T2> GetReactive<T2>(Expression<Func<T, T2>> selector)
    {
        var propertyName = GetSinglePropertyName(selector, nameof(GetReactive));

        if (!_reactiveCache.TryGetValue(propertyName, out var cached))
        {
            var value = Get(selector);
            cached = new Reactive<T2>(value);
            _reactiveCache[propertyName] = cached;
        }
        return (IReactive<T2>)cached;
    }

    public IControl GetControl<T2>(Expression<Func<T, T2>> selector)
    {
        var propertyName = GetSinglePropertyName(selector, nameof(GetControl));

        if (!_controlCache.TryGetValue(propertyName, out var control))
        {
            // Get the current value from the POCO and create a control with it
            var value = Get(selector);
            control = Control<object?>.Create(value);
            _controlCache[propertyName] = control;
        }
        return control;
    }

    public bool HaveControl<T2>(Expression<Func<T, T2>> selector)
    {
        var propertyName = GetSinglePropertyName(selector, nameof(HaveControl));
        return _controlCache.ContainsKey(propertyName);
    }

    /// <summary>
    /// Extracts a property path from an expression.
    /// Supports simple property access (x => x.Property) and nested access (x => x.Nested.Property).
    /// </summary>
    private string GetPropertyPath(LambdaExpression expression)
    {
        var parts = new List<string>();
        var current = expression.Body;

        while (current != null)
        {
            switch (current)
            {
                case MemberExpression memberExpr:
                    parts.Insert(0, memberExpr.Member.Name);
                    current = memberExpr.Expression;
                    break;
                case ParameterExpression:
                    // Reached the parameter, we're done
                    current = null;
                    break;
                default:
                    throw new ArgumentException(
                        $"Unsupported expression type: {current.GetType().Name}. Only property access expressions are supported.",
                        nameof(expression)
                    );
            }
        }

        return string.Join(".", parts);
    }

    /// <summary>
    /// Extracts a single property name from an expression and validates that it's not nested.
    /// Used by GetControl, HaveControl, and GetReactive which only support single-level access.
    /// </summary>
    private string GetSinglePropertyName(LambdaExpression expression, string methodName)
    {
        var propertyPath = GetPropertyPath(expression);

        if (propertyPath.Contains('.'))
        {
            throw new ArgumentException(
                $"{methodName} only supports single-level property access. " +
                $"Use GetReactive to navigate nested objects first. Expression: {expression}",
                nameof(expression)
            );
        }

        return propertyPath;
    }

    /// <summary>
    /// Compiles and caches an expression for efficient repeated access.
    /// </summary>
    private Delegate GetOrCompileAccessor(LambdaExpression expression)
    {
        var key = GetPropertyPath(expression);
        if (!_compiledAccessors.TryGetValue(key, out var accessor))
        {
            accessor = expression.Compile();
            _compiledAccessors[key] = accessor;
        }
        return accessor;
    }
}
