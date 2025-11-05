using System.Collections.Immutable;
using System.Text.Json.Nodes;
using Astrolabe.Evaluator.Functions;

namespace Astrolabe.Evaluator.Test;

/// <summary>
/// Tests for PartialEvaluator - verifies that expressions are partially evaluated
/// with compile-time values substituted while preserving runtime expressions.
/// </summary>
public class PartialEvaluatorTests
{
    private static PartialEvalEnvironment CreatePartialEnv(Dictionary<string, object?>? compileTimeVars = null)
    {
        // Create compile-time variables
        var vars = compileTimeVars ?? new Dictionary<string, object?>();
        var varExprs = vars.ToDictionary(
            kvp => kvp.Key,
            kvp => (EvalExpr)CreateValueExpr(kvp.Value)
        );

        // Create environment with no data context (Undefined)
        var state = new EvalEnvironmentState(
            Data: new EvalData(ValueExpr.Undefined, (_, __) => ValueExpr.Undefined),
            Current: ValueExpr.Undefined,
            Compare: EvalEnvironment.DefaultComparison,
            LocalVariables: varExprs.ToImmutableDictionary(),
            Parent: null,
            Errors: []
        );

        var env = new PartialEvalEnvironment(state);
        return env.AddDefaultFunctions() as PartialEvalEnvironment
            ?? throw new InvalidOperationException("AddDefaultFunctions should return PartialEvalEnvironment");
    }

    private static ValueExpr CreateValueExpr(object? value)
    {
        return value switch
        {
            null => ValueExpr.Null,
            Dictionary<string, object?> dict => new ValueExpr(
                new ObjectValue(
                    dict.ToDictionary(
                        kvp => kvp.Key,
                        kvp => CreateValueExpr(kvp.Value)
                    )
                )
            ),
            _ => new ValueExpr(value)
        };
    }

    private static string PrintExpr(EvalExpr expr)
    {
        return expr.Print();
    }

    [Fact]
    public void LiteralValues_RemainUnchanged()
    {
        // Test case 1: Literal values remain unchanged
        var env = CreatePartialEnv();
        var expr = ExprParser.Parse("42");

        var result = env.PartialEvaluate(expr);

        Assert.IsType<ValueExpr>(result);
        // Parser returns doubles for numeric literals
        Assert.Equal(42.0, ((ValueExpr)result).Value);
    }

    [Fact]
    public void VariableSubstitution_WithCompileTimeValue()
    {
        // Test case 2: Variable substitution
        var env = CreatePartialEnv(new Dictionary<string, object?>
        {
            ["vv"] = new Dictionary<string, object?> { ["x"] = 100 }
        });
        var expr = ExprParser.Parse("$vv.x");

        var result = env.PartialEvaluate(expr);

        Assert.IsType<ValueExpr>(result);
        Assert.Equal(100, ((ValueExpr)result).Value);
    }

    [Fact]
    public void Ternary_WithKnownConditionTrue()
    {
        // Test case 3: Ternary with known condition (true)
        var env = CreatePartialEnv(new Dictionary<string, object?>
        {
            ["vv"] = new Dictionary<string, object?> { ["flag"] = true }
        });
        var expr = ExprParser.Parse("$vv.flag ? field1 : field2");

        var result = env.PartialEvaluate(expr);

        // Should return PropertyExpr for field1
        Assert.IsType<PropertyExpr>(result);
        Assert.Equal("field1", ((PropertyExpr)result).Property);
    }

    [Fact]
    public void Ternary_WithKnownConditionFalse()
    {
        // Test case 4: Ternary with known condition (false) - main example
        var env = CreatePartialEnv(new Dictionary<string, object?>
        {
            ["vv"] = new Dictionary<string, object?>
            {
                ["length"] = 19,
                ["other"] = 40
            }
        });
        var expr = ExprParser.Parse("$vv.length > 20 ? field1 + field2 : field3 + $vv.other");

        var result = env.PartialEvaluate(expr);

        // Should be: field3 + 40
        var printed = PrintExpr(result);
        Assert.Contains("field3", printed);
        Assert.Contains("40", printed);
        Assert.DoesNotContain("field1", printed);
        Assert.DoesNotContain("field2", printed);
    }

    [Fact]
    public void Ternary_WithUnknownCondition()
    {
        // Test case 5: Ternary with unknown condition
        var env = CreatePartialEnv();
        var expr = ExprParser.Parse("field1 > 20 ? field2 : field3");

        var result = env.PartialEvaluate(expr);

        // Should remain as ternary
        Assert.IsType<CallExpr>(result);
        var call = (CallExpr)result;
        Assert.Equal("?", call.Function);
        Assert.Equal(3, call.Args.Count);
    }

    [Fact]
    public void BinaryOp_WithBothOperandsKnown()
    {
        // Test case 6: Binary operation with both operands known
        var env = CreatePartialEnv(new Dictionary<string, object?>
        {
            ["vv"] = new Dictionary<string, object?>
            {
                ["a"] = 10,
                ["b"] = 20
            }
        });
        var expr = ExprParser.Parse("$vv.a + $vv.b");

        var result = env.PartialEvaluate(expr);

        Assert.IsType<ValueExpr>(result);
        Assert.Equal(30L, ((ValueExpr)result).Value);
    }

    [Fact]
    public void BinaryOp_WithOneOperandKnown()
    {
        // Test case 7: Binary operation with one operand known
        var env = CreatePartialEnv(new Dictionary<string, object?>
        {
            ["vv"] = new Dictionary<string, object?> { ["offset"] = 5 }
        });
        var expr = ExprParser.Parse("field1 + $vv.offset");

        var result = env.PartialEvaluate(expr);

        // Should be: field1 + 5
        Assert.IsType<CallExpr>(result);
        var call = (CallExpr)result;
        Assert.Equal("+", call.Function);
        Assert.IsType<PropertyExpr>(call.Args[0]);
        Assert.IsType<ValueExpr>(call.Args[1]);
        Assert.Equal(5, ((ValueExpr)call.Args[1]).Value);
    }

    [Fact]
    public void BinaryOp_WithNoOperandsKnown()
    {
        // Test case 8: Binary operation with no operands known
        var env = CreatePartialEnv();
        var expr = ExprParser.Parse("field1 + field2");

        var result = env.PartialEvaluate(expr);

        // Should remain as binary op
        Assert.IsType<CallExpr>(result);
        var call = (CallExpr)result;
        Assert.Equal("+", call.Function);
        Assert.IsType<PropertyExpr>(call.Args[0]);
        Assert.IsType<PropertyExpr>(call.Args[1]);
    }

    [Fact]
    public void NestedExpressions_PartiallyEvaluated()
    {
        // Test case 9: Nested expressions
        var env = CreatePartialEnv(new Dictionary<string, object?>
        {
            ["vv"] = new Dictionary<string, object?>
            {
                ["x"] = 15,
                ["y"] = 3,
                ["z"] = 2
            }
        });
        var expr = ExprParser.Parse("$vv.x > 10 ? field1 + $vv.y : field2 * $vv.z");

        var result = env.PartialEvaluate(expr);

        // Condition $vv.x > 10 = 15 > 10 = true
        // Should pick true branch: field1 + $vv.y = field1 + 3
        var printed = PrintExpr(result);
        Assert.Contains("field1", printed);
        Assert.Contains("3", printed);
        Assert.DoesNotContain("field2", printed);
    }

    [Fact]
    public void Array_WithMixedKnownUnknownElements()
    {
        // Test case 10: Array with mixed known/unknown elements
        var env = CreatePartialEnv(new Dictionary<string, object?>
        {
            ["vv"] = new Dictionary<string, object?>
            {
                ["a"] = 1,
                ["b"] = 2
            }
        });
        var expr = ExprParser.Parse("[$vv.a, field1, $vv.b]");

        var result = env.PartialEvaluate(expr);

        // Should be: [1, field1, 2]
        Assert.IsType<ArrayExpr>(result);
        var arr = (ArrayExpr)result;
        Assert.Equal(3, arr.Values.Count());
        Assert.IsType<ValueExpr>(arr.Values.ElementAt(0));
        Assert.IsType<PropertyExpr>(arr.Values.ElementAt(1));
        Assert.IsType<ValueExpr>(arr.Values.ElementAt(2));
    }

    [Fact]
    public void LetExpr_WithPartialBindings()
    {
        // Test case 11: Let expression with partial bindings
        var env = CreatePartialEnv(new Dictionary<string, object?>
        {
            ["vv"] = new Dictionary<string, object?> { ["value"] = 10 }
        });
        var expr = ExprParser.Parse("let $x := $vv.value, $y := field1 in $x + $y");

        var result = env.PartialEvaluate(expr);

        // $x is fully evaluated to 10, but $y depends on field1
        // Result should be: 10 + field1
        var printed = PrintExpr(result);
        Assert.Contains("10", printed);
        Assert.Contains("field1", printed);
    }

    [Fact]
    public void Lambda_WithCompileTimeValuesInBody()
    {
        // Test case 12: Lambda with compile-time values in body
        var env = CreatePartialEnv(new Dictionary<string, object?>
        {
            ["vv"] = new Dictionary<string, object?> { ["offset"] = 5 }
        });
        // Just test the lambda itself, not wrapped in a map call
        var expr = ExprParser.Parse("$x => $x + $vv.offset");

        var result = env.PartialEvaluate(expr);

        // Should be a lambda with partially evaluated body
        Assert.IsType<LambdaExpr>(result);
        var lambda = (LambdaExpr)result;

        // Lambda body should be $x + 5
        var printed = PrintExpr(lambda.Value);
        Assert.Contains("5", printed);
        Assert.Contains("$x", printed);
        Assert.DoesNotContain("$vv", printed); // $vv should be evaluated away
    }
}
