using Astrolabe.Evaluator.Functions;

namespace Astrolabe.Evaluator;

/// <summary>
/// Abstract base class for evaluation environments.
/// Mirrors TypeScript's EvalEnv abstract class.
/// </summary>
public abstract class EvalEnv
{
    /// <summary>
    /// Compare two values for ordering.
    /// </summary>
    public abstract int Compare(object? v1, object? v2);

    /// <summary>
    /// Create a new child scope with variable bindings.
    /// Variables are stored unevaluated and evaluated lazily on first access.
    /// </summary>
    public abstract EvalEnv NewScope(IReadOnlyDictionary<string, EvalExpr> vars);

    /// <summary>
    /// Evaluate an expression and return the result.
    /// - BasicEvalEnv: Returns ValueExpr (full evaluation)
    /// - PartialEvalEnv: Returns EvalExpr (may be symbolic)
    /// </summary>
    public abstract EvalExpr EvaluateExpr(EvalExpr expr);

    /// <summary>
    /// Get the current data context value (bound to _ variable).
    /// Returns null if no data context is available.
    /// </summary>
    public abstract EvalExpr? GetCurrentValue();

    /// <summary>
    /// Attach dependencies to a ValueExpr result.
    /// Filters to only ValueExpr deps and merges with existing.
    /// </summary>
    public ValueExpr WithDeps(ValueExpr result, IEnumerable<EvalExpr> deps)
    {
        var valueDeps = deps.OfType<ValueExpr>().ToList();
        if (valueDeps.Count == 0)
            return result;

        var existingDeps = result.Deps?.ToList() ?? [];
        var allDeps = existingDeps.Concat(valueDeps);

        return result with
        {
            Deps = allDeps,
        };
    }

    /// <summary>
    /// Get property from a ValueExpr object.
    /// Handles path tracking and dependency preservation.
    /// </summary>
    public static ValueExpr GetPropertyFromValue(ValueExpr value, string property)
    {
        var propPath = value.Path != null ? new FieldPath(property, value.Path) : null;
        return value.Value switch
        {
            ObjectValue ov when ov.Properties.TryGetValue(property, out var propVal) =>
                propVal with
                {
                    Path = propPath,
                    Deps = CombineDeps(value.Deps, propVal.Deps)
                },
            _ => new ValueExpr(null, propPath)
        };
    }

    private static IEnumerable<ValueExpr>? CombineDeps(IEnumerable<ValueExpr>? deps1, IEnumerable<ValueExpr>? deps2)
    {
        if (deps1 == null) return deps2;
        if (deps2 == null) return deps1;
        var combined = deps1.Concat(deps2).ToList();
        return combined.Count > 0 ? combined : null;
    }

    /// <summary>
    /// Create a comparison function that compares numbers to a given number of significant digits.
    /// </summary>
    public static Func<object?, object?, int> CompareSignificantDigits(int digits)
    {
        var multiply = (long)Math.Pow(10, digits);
        return (v1, v2) =>
            (v1, v2) switch
            {
                (long l1, long l2) => l1.CompareTo(l2),
                (int i1, int i2) => i1.CompareTo(i2),
                (long l1, int i2) => l1.CompareTo(i2),
                (int i1, long l2) => -l2.CompareTo(i1),
                (_, double d2) => NumberCompare(ValueExpr.AsDouble(v1), d2),
                (double d1, _) => NumberCompare(d1, ValueExpr.AsDouble(v2)),
                (string s1, string s2) => string.Compare(s1, s2, StringComparison.InvariantCulture),
                _ => Equals(v1, v2) ? 0
                : v1 == null ? 1
                : -1,
            };

        int NumberCompare(double d1, double d2)
        {
            var l1 = (long)Math.Round(d1 * multiply);
            var l2 = (long)Math.Round(d2 * multiply);
            return l1.CompareTo(l2);
        }
    }

    /// <summary>
    /// Default comparison function with 5 significant digits.
    /// </summary>
    public static readonly Func<object?, object?, int> DefaultComparison = CompareSignificantDigits(
        5
    );
}

/// <summary>
/// Factory methods for creating EvalEnv instances.
/// </summary>
public static class EvalEnvFactory
{
    /// <summary>
    /// Create a BasicEvalEnv with root data and default functions.
    /// </summary>
    /// <param name="root">Optional root data to bind to the _ variable</param>
    /// <param name="functions">Optional additional functions (FunctionHandler wrapped in ValueExpr)</param>
    /// <param name="compare">Optional custom compare function</param>
    /// <returns>A new BasicEvalEnv configured with the given data and functions</returns>
    public static BasicEvalEnv CreateBasicEnv(
        object? root = null,
        IReadOnlyDictionary<string, EvalExpr>? functions = null,
        Func<object?, object?, int>? compare = null
    )
    {
        var vars = new Dictionary<string, EvalExpr>();

        // Add default functions
        foreach (var (name, handler) in DefaultFunctions.FunctionHandlers)
        {
            vars[name] = new ValueExpr(handler);
        }

        // Add custom functions (can override defaults)
        if (functions != null)
        {
            foreach (var (name, expr) in functions)
                vars[name] = expr;
        }

        // Add root data as _ variable
        if (root != null)
        {
            vars["_"] = ObjectToValueExpr(root);
        }

        return new BasicEvalEnv(vars, null, compare ?? EvalEnv.CompareSignificantDigits(5));
    }

    /// <summary>
    /// Create a PartialEvalEnv with default functions.
    /// </summary>
    /// <param name="functions">Optional additional functions (FunctionHandler wrapped in ValueExpr)</param>
    /// <param name="current">Optional current value to bind to the _ variable</param>
    /// <returns>A new PartialEvalEnv configured with the given functions and current value</returns>
    public static PartialEvalEnv CreatePartialEnv(
        IReadOnlyDictionary<string, EvalExpr>? functions = null,
        ValueExpr? current = null
    )
    {
        var vars = new Dictionary<string, EvalExpr>();

        // Add default functions
        foreach (var (name, handler) in DefaultFunctions.FunctionHandlers)
        {
            vars[name] = new ValueExpr(handler);
        }

        // Add custom functions (can override defaults)
        if (functions != null)
        {
            foreach (var (name, expr) in functions)
                vars[name] = expr;
        }

        // Add current value as _ variable
        if (current != null)
            vars["_"] = current;

        return new PartialEvalEnv(vars, null, EvalEnv.CompareSignificantDigits(5));
    }

    /// <summary>
    /// Create a BasicEvalEnv with root data and default functions.
    /// Convenience method that takes raw data.
    /// </summary>
    public static BasicEvalEnv BasicEnv(object? root = null)
    {
        return CreateBasicEnv(root);
    }

    /// <summary>
    /// Create a PartialEvalEnv with default functions.
    /// Convenience method for partial evaluation.
    /// </summary>
    public static PartialEvalEnv PartialEnv(object? data = null)
    {
        var current = data != null ? ObjectToValueExpr(data) : null;
        return CreatePartialEnv(current: current);
    }

    /// <summary>
    /// Convert an object to a ValueExpr, handling JsonNode and other types.
    /// </summary>
    private static ValueExpr ObjectToValueExpr(object? obj)
    {
        return obj switch
        {
            null => ValueExpr.Null,
            ValueExpr ve => ve,
            System.Text.Json.Nodes.JsonNode jn => JsonDataLookup.ToValue(DataPath.Empty, jn),
            _ => new ValueExpr(obj), // For simple values like primitives
        };
    }
}
