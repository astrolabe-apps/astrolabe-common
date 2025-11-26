using System.Text.Json.Nodes;
using Astrolabe.Evaluator.Functions;

namespace Astrolabe.Evaluator.Test;

/// <summary>
/// Test evaluation context using the EvalEnv-based system.
/// Uses BasicEvalEnv or PartialEvalEnv internally.
/// </summary>
public class TestEvalContext
{
    private readonly EvalEnv _env;

    internal TestEvalContext(EvalEnv env)
    {
        _env = env;
    }

    /// <summary>
    /// Create a new context with additional variables.
    /// Use for tests that need to set up variables before evaluation.
    /// </summary>
    public TestEvalContext WithVariables(params (string name, object? value)[] vars)
    {
        var bindings = new Dictionary<string, EvalExpr>();
        foreach (var (name, value) in vars)
        {
            bindings[name] = value is EvalExpr expr ? expr : new ValueExpr(value);
        }
        return new TestEvalContext(_env.NewScope(bindings));
    }

    /// <summary>
    /// Full evaluation - returns ValueExpr result.
    /// Use for tests that only care about the computed value.
    /// Equivalent to TypeScript: evalResult()
    /// </summary>
    public ValueExpr EvalResult(EvalExpr expr)
    {
        var result = _env.EvaluateExpr(expr);
        return result as ValueExpr ?? throw new InvalidOperationException($"Expected ValueExpr but got {result.GetType().Name}");
    }

    /// <summary>
    /// Partial evaluation - returns symbolic expression for unknown variables.
    /// Use for tests that need to inspect partial evaluation results.
    /// Equivalent to TypeScript: evalPartial()
    /// </summary>
    public EvalExpr EvalPartial(EvalExpr expr)
    {
        var result = _env.EvaluateExpr(expr);
        // Call Uninline if using PartialEvalEnv
        if (_env is PartialEvalEnv partialEnv)
        {
            return partialEnv.Uninline(result);
        }
        return result;
    }

    /// <summary>
    /// Evaluate an expression and return result with errors.
    /// Collects errors recursively from the result and all its dependencies.
    /// </summary>
    public (ValueExpr Result, IEnumerable<string> Errors) EvalWithErrors(EvalExpr expr)
    {
        var result = _env.EvaluateExpr(expr);
        if (result is ValueExpr ve)
        {
            return (ve, ValueExpr.CollectAllErrors(ve));
        }
        throw new InvalidOperationException($"Expected ValueExpr but got {result.GetType().Name}");
    }
}

/// <summary>
/// Test helper methods that abstract evaluation API calls.
/// Uses the new EvalEnv-based system (BasicEvalEnv, PartialEvalEnv).
/// </summary>
public static class TestHelpers
{
    /// <summary>
    /// Evaluate a string expression with data context.
    /// Returns the raw value property from the ValueExpr.
    /// </summary>
    public static object? EvalExpr(string expr, JsonObject? data = null)
    {
        var env = EvalEnvFactory.BasicEnv(data);
        var parsed = ExprParser.Parse(expr);
        var result = env.EvaluateExpr(parsed);
        return (result as ValueExpr)?.Value;
    }

    /// <summary>
    /// Evaluate a string expression and convert result to native representation.
    /// </summary>
    public static object? EvalExprNative(string expr, JsonObject? data = null)
    {
        var env = EvalEnvFactory.BasicEnv(data);
        var parsed = ExprParser.Parse(expr);
        var result = env.EvaluateExpr(parsed);
        return (result as ValueExpr)?.ToNative();
    }

    /// <summary>
    /// Evaluate a string expression and return result as array.
    /// Throws if result is not an array.
    /// </summary>
    public static IEnumerable<object?> EvalToArray(string expr, JsonObject? data = null)
    {
        var env = EvalEnvFactory.BasicEnv(data);
        var parsed = ExprParser.Parse(expr);
        var result = env.EvaluateExpr(parsed);
        var native = (result as ValueExpr)?.ToNative();
        if (native is not IEnumerable<object?> array)
        {
            throw new InvalidOperationException("Expected array result");
        }
        return array;
    }

    /// <summary>
    /// Create a basic (full) evaluation context with data.
    /// </summary>
    public static TestEvalContext CreateBasicEnv(JsonObject? data = null)
    {
        return new TestEvalContext(EvalEnvFactory.BasicEnv(data));
    }

    /// <summary>
    /// Create a partial evaluation context (returns symbolic for unknown variables).
    /// </summary>
    public static TestEvalContext CreatePartialEnv(JsonObject? data = null)
    {
        return new TestEvalContext(EvalEnvFactory.PartialEnv(data));
    }

    /// <summary>
    /// Parse an expression string into an EvalExpr.
    /// Convenience wrapper around ExprParser.Parse().
    /// </summary>
    public static EvalExpr Parse(string expr)
    {
        return ExprParser.Parse(expr);
    }

    /// <summary>
    /// Assert that a numeric result equals the expected value.
    /// Handles int, long, and double comparisons transparently.
    /// </summary>
    public static void AssertNumericEqual(double expected, object? actual, double precision = 0.0001)
    {
        Assert.NotNull(actual);
        var actualDouble = Convert.ToDouble(actual);
        Assert.Equal(expected, actualDouble, precision);
    }

    /// <summary>
    /// Assert that a numeric result equals the expected integer value.
    /// For exact integer comparisons.
    /// </summary>
    public static void AssertNumericEqual(int expected, object? actual)
    {
        Assert.NotNull(actual);
        var actualLong = Convert.ToInt64(actual);
        Assert.Equal(expected, actualLong);
    }
}
