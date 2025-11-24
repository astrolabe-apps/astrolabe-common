using Astrolabe.Evaluator.Functions;

namespace Astrolabe.Evaluator.Test;

/// <summary>
/// Tests for comparison operators with partial evaluation.
/// Verifies that comparison operators print correctly when used with symbolic values.
/// </summary>
public class ComparisonPartialEvalTests
{
    private static EvalEnvironment CreateEnv()
    {
        var state = EvalEnvironmentState.EmptyState(EvalData.UndefinedData());
        return new PartialEvalEnvironment(state).AddDefaultFunctions();
    }

    private static EvalExpr Parse(string expr)
    {
        return ExprParser.Parse(expr);
    }

    [Fact]
    public void PartialEval_EqualityWithUnknownVariable_PrintsCorrectly()
    {
        var env = CreateEnv();
        var expr = Parse("$undefined = \"string\"");

        var (_, result) = env.EvaluateExpr(expr);

        // Should print as: $undefined = "string"
        // NOT as: $_($undefined, "string")
        var printed = result.Print();
        Assert.Equal("$undefined = \"string\"", printed);
    }

    [Fact]
    public void PartialEval_NotEqualsWithUnknownVariable_PrintsCorrectly()
    {
        var env = CreateEnv();
        var expr = Parse("$x != 5");

        var (_, result) = env.EvaluateExpr(expr);

        var printed = result.Print();
        Assert.Equal("$x != 5", printed);
    }

    [Fact]
    public void PartialEval_LessThanWithUnknownVariable_PrintsCorrectly()
    {
        var env = CreateEnv();
        var expr = Parse("$y < 10");

        var (_, result) = env.EvaluateExpr(expr);

        var printed = result.Print();
        Assert.Equal("$y < 10", printed);
    }

    [Fact]
    public void PartialEval_GreaterThanWithUnknownVariable_PrintsCorrectly()
    {
        var env = CreateEnv();
        var expr = Parse("100 > $z");

        var (_, result) = env.EvaluateExpr(expr);

        var printed = result.Print();
        Assert.Equal("100 > $z", printed);
    }

    [Fact]
    public void PartialEval_LessThanOrEqualsWithUnknownVariable_PrintsCorrectly()
    {
        var env = CreateEnv();
        var expr = Parse("$a <= 20");

        var (_, result) = env.EvaluateExpr(expr);

        var printed = result.Print();
        Assert.Equal("$a <= 20", printed);
    }

    [Fact]
    public void PartialEval_GreaterThanOrEqualsWithUnknownVariable_PrintsCorrectly()
    {
        var env = CreateEnv();
        var expr = Parse("50 >= $b");

        var (_, result) = env.EvaluateExpr(expr);

        var printed = result.Print();
        Assert.Equal("50 >= $b", printed);
    }

    [Fact]
    public void PartialEval_ComparisonWithTwoUnknownVariables_PrintsCorrectly()
    {
        var env = CreateEnv();
        var expr = Parse("$x = $y");

        var (_, result) = env.EvaluateExpr(expr);

        var printed = result.Print();
        Assert.Equal("$x = $y", printed);
    }

    [Fact]
    public void PartialEval_ComplexComparisonExpression_PrintsCorrectly()
    {
        var env = CreateEnv();
        var expr = Parse("($x + 5) > ($y * 2)");

        var (_, result) = env.EvaluateExpr(expr);

        // Parentheses aren't necessary due to operator precedence
        var printed = result.Print();
        Assert.Equal("$x + 5 > $y * 2", printed);
    }

    [Fact]
    public void PartialEval_ComparisonWithPartialEvaluation_PrintsCorrectly()
    {
        var env = CreateEnv();
        var expr = Parse("(10 + 5) < $unknown");

        var (_, result) = env.EvaluateExpr(expr);

        // 10 + 5 should evaluate to 15
        var printed = result.Print();
        Assert.Equal("15 < $unknown", printed);
    }
}