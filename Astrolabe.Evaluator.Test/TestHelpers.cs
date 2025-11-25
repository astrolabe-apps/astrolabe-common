using System.Text.Json.Nodes;
using Astrolabe.Evaluator.Functions;

namespace Astrolabe.Evaluator.Test;

/// <summary>
/// Test evaluation context that hides EvalEnvironment internals.
/// Tests work with this opaque wrapper instead of EvalEnvironment directly.
/// This mirrors the TypeScript approach where tests don't see the internal EvalEnv class.
/// </summary>
public class TestEvalContext
{
    private readonly EvalEnvironment _env;

    internal TestEvalContext(EvalEnvironment env)
    {
        _env = env;
    }

    /// <summary>
    /// Create a new context with additional variables.
    /// Use for tests that need to set up variables before evaluation.
    /// </summary>
    public TestEvalContext WithVariables(params (string name, object? value)[] vars)
    {
        var kvps = vars.Select(v => new KeyValuePair<string, EvalExpr>(
            v.name,
            v.value is EvalExpr expr ? expr : new ValueExpr(v.value)
        )).ToList();
        return new TestEvalContext(_env.WithVariables(kvps));
    }

    /// <summary>
    /// Full evaluation - returns ValueExpr result.
    /// Use for tests that only care about the computed value.
    /// Equivalent to TypeScript: evalResult()
    /// </summary>
    public ValueExpr EvalResult(EvalExpr expr)
    {
        var (_, result) = _env.Evaluate(expr);
        return result;
    }

    /// <summary>
    /// Partial evaluation - returns symbolic expression for unknown variables.
    /// Use for tests that need to inspect partial evaluation results.
    /// Equivalent to TypeScript: evalPartial()
    /// </summary>
    public EvalExpr EvalPartial(EvalExpr expr)
    {
        var (_, result) = _env.EvaluateExpr(expr);
        return result;
    }

    /// <summary>
    /// Evaluate an expression and return result with errors.
    /// Use for tests that need to check error conditions.
    /// Equivalent to TypeScript: evalWithErrors()
    /// </summary>
    public (ValueExpr Result, IEnumerable<EvalError> Errors) EvalWithErrors(EvalExpr expr)
    {
        var (nextEnv, result) = _env.Evaluate(expr);
        return (result, nextEnv.Errors);
    }
}

/// <summary>
/// Test helper methods that abstract evaluation API calls.
/// When the evaluator API changes during refactor, only these helpers need updating.
/// Mirrors the TypeScript test/testHelpers.ts implementation.
/// </summary>
public static class TestHelpers
{
    /// <summary>
    /// Evaluate a string expression with data context (convenience wrapper).
    /// Returns the raw value property from the ValueExpr.
    /// Use for simple integration tests.
    /// Equivalent to TypeScript: evalExpr()
    /// </summary>
    public static object? EvalExpr(string expr, JsonObject? data = null)
    {
        var env = CreateBasicEnvInternal(data);
        var parsed = ExprParser.Parse(expr);
        var (_, result) = env.Evaluate(parsed);
        return result.Value;
    }

    /// <summary>
    /// Evaluate a string expression and convert result to native representation.
    /// Use for tests expecting native values (unwrapped from ArrayValue/ObjectValue).
    /// Equivalent to TypeScript: evalExprNative()
    /// </summary>
    public static object? EvalExprNative(string expr, JsonObject? data = null)
    {
        var env = CreateBasicEnvInternal(data);
        var parsed = ExprParser.Parse(expr);
        var (_, result) = env.Evaluate(parsed);
        return result.ToNative();
    }

    /// <summary>
    /// Evaluate a string expression and return result as array.
    /// Throws if result is not an array.
    /// Use for tests expecting array results.
    /// Equivalent to TypeScript: evalToArray()
    /// </summary>
    public static IEnumerable<object?> EvalToArray(string expr, JsonObject? data = null)
    {
        var env = CreateBasicEnvInternal(data);
        var parsed = ExprParser.Parse(expr);
        var (_, result) = env.Evaluate(parsed);
        var native = result.ToNative();
        if (native is not IEnumerable<object?> array)
        {
            throw new InvalidOperationException("Expected array result");
        }
        return array;
    }

    /// <summary>
    /// Create a basic (full) evaluation context with data.
    /// Use for normal evaluation tests where all variables should resolve.
    /// </summary>
    public static TestEvalContext CreateBasicEnv(JsonObject? data = null)
    {
        return new TestEvalContext(CreateBasicEnvInternal(data));
    }

    /// <summary>
    /// Create a partial evaluation context (returns symbolic for unknown variables).
    /// Use for partial evaluation tests where undefined variables remain symbolic.
    /// </summary>
    public static TestEvalContext CreatePartialEnv(JsonObject? data = null)
    {
        return new TestEvalContext(CreatePartialEnvInternal(data));
    }

    /// <summary>
    /// Parse an expression string into an EvalExpr.
    /// Convenience wrapper around ExprParser.Parse().
    /// </summary>
    public static EvalExpr Parse(string expr)
    {
        return ExprParser.Parse(expr);
    }

    // Internal methods that create the actual EvalEnvironment instances
    private static EvalEnvironment CreateBasicEnvInternal(JsonObject? data)
    {
        var evalData = data == null
            ? EvalData.UndefinedData()
            : JsonDataLookup.FromObject(data);
        return EvalEnvironment.DataFrom(evalData).AddDefaultFunctions();
    }

    private static EvalEnvironment CreatePartialEnvInternal(JsonObject? data)
    {
        var evalData = data == null
            ? EvalData.UndefinedData()
            : JsonDataLookup.FromObject(data);
        var state = EvalEnvironmentState.EmptyState(evalData);
        return new PartialEvalEnvironment(state).AddDefaultFunctions();
    }
}
