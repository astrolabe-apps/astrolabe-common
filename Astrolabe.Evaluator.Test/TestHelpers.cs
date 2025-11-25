using System.Text.Json.Nodes;
using Astrolabe.Evaluator.Functions;

namespace Astrolabe.Evaluator.Test;

/// <summary>
/// Test helper methods that abstract evaluation API calls.
/// When the evaluator API changes during refactor, only these helpers need updating.
/// Mirrors the TypeScript test/testHelpers.ts implementation.
/// </summary>
public static class TestHelpers
{
    /// <summary>
    /// Evaluate an expression and return just the result.
    /// Use for tests that only care about the computed value.
    /// Equivalent to TypeScript: evalResult()
    /// </summary>
    public static ValueExpr EvalResult(this EvalEnvironment env, EvalExpr expr)
    {
        var (_, result) = env.Evaluate(expr);
        return result;
    }

    /// <summary>
    /// Partial evaluation - returns symbolic expression for unknown variables.
    /// Use for tests that need to inspect partial evaluation results.
    /// Equivalent to TypeScript: evalPartial()
    /// </summary>
    public static EvalExpr EvalPartial(this EvalEnvironment env, EvalExpr expr)
    {
        var (_, result) = env.EvaluateExpr(expr);
        return result;
    }

    /// <summary>
    /// Evaluate an expression and return result with errors.
    /// Use for tests that need to check error conditions.
    /// Equivalent to TypeScript: evalWithErrors()
    /// </summary>
    public static (ValueExpr Result, IEnumerable<EvalError> Errors) EvalWithErrors(
        this EvalEnvironment env,
        EvalExpr expr)
    {
        var (nextEnv, result) = env.Evaluate(expr);
        return (result, nextEnv.Errors);
    }

    /// <summary>
    /// Evaluate a string expression with data context (convenience wrapper).
    /// Returns the raw value property from the ValueExpr.
    /// Use for simple integration tests.
    /// Equivalent to TypeScript: evalExpr()
    /// </summary>
    public static object? EvalExpr(string expr, JsonObject? data = null)
    {
        var env = CreateBasicEnv(data);
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
        var env = CreateBasicEnv(data);
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
        var env = CreateBasicEnv(data);
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
    /// Create a basic (full) evaluation environment with data.
    /// Use for normal evaluation tests where all variables should resolve.
    /// </summary>
    public static EvalEnvironment CreateBasicEnv(JsonObject? data = null)
    {
        var evalData = data == null
            ? EvalData.UndefinedData()
            : JsonDataLookup.FromObject(data);
        return EvalEnvironment.DataFrom(evalData).AddDefaultFunctions();
    }

    /// <summary>
    /// Create a partial evaluation environment (returns symbolic for unknown variables).
    /// Use for partial evaluation tests where undefined variables remain symbolic.
    /// </summary>
    public static EvalEnvironment CreatePartialEnv(JsonObject? data = null)
    {
        var evalData = data == null
            ? EvalData.UndefinedData()
            : JsonDataLookup.FromObject(data);
        var state = EvalEnvironmentState.EmptyState(evalData);
        return new PartialEvalEnvironment(state).AddDefaultFunctions();
    }

    /// <summary>
    /// Parse an expression string into an EvalExpr.
    /// Convenience wrapper around ExprParser.Parse().
    /// </summary>
    public static EvalExpr Parse(string expr)
    {
        return ExprParser.Parse(expr);
    }
}
