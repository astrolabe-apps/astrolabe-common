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
    /// - PartialEvalEnv2: Returns EvalExpr (may be symbolic)
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
        if (valueDeps.Count == 0) return result;

        var existingDeps = result.Deps?.ToList() ?? [];
        var allDeps = existingDeps.Concat(valueDeps);

        return result with { Deps = allDeps };
    }
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
    /// <param name="functions">Optional additional functions (FunctionHandler2 wrapped in ValueExpr)</param>
    /// <returns>A new BasicEvalEnv configured with the given data and functions</returns>
    public static BasicEvalEnv CreateBasicEnv(
        object? root = null,
        IReadOnlyDictionary<string, EvalExpr>? functions = null)
    {
        var vars = new Dictionary<string, EvalExpr>();

        // Add default functions
        foreach (var (name, handler) in DefaultFunctions2.FunctionHandlers2)
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

        return new BasicEvalEnv(
            vars,
            null,
            EvalEnvironment.CompareSignificantDigits(5));
    }

    /// <summary>
    /// Create a PartialEvalEnv2 with default functions.
    /// </summary>
    /// <param name="functions">Optional additional functions (FunctionHandler2 wrapped in ValueExpr)</param>
    /// <param name="current">Optional current value to bind to the _ variable</param>
    /// <returns>A new PartialEvalEnv2 configured with the given functions and current value</returns>
    public static PartialEvalEnv2 CreatePartialEnv(
        IReadOnlyDictionary<string, EvalExpr>? functions = null,
        ValueExpr? current = null)
    {
        var vars = new Dictionary<string, EvalExpr>();

        // Add default functions
        foreach (var (name, handler) in DefaultFunctions2.FunctionHandlers2)
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

        return new PartialEvalEnv2(
            vars,
            null,
            EvalEnvironment.CompareSignificantDigits(5));
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
    /// Create a PartialEvalEnv2 with default functions.
    /// Convenience method for partial evaluation.
    /// </summary>
    public static PartialEvalEnv2 PartialEnv(object? data = null)
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
            _ => new ValueExpr(obj) // For simple values like primitives
        };
    }
}
