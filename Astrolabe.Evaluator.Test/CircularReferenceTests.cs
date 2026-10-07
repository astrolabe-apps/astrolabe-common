namespace Astrolabe.Evaluator.Test;

public class CircularReferenceTests
{
    public static TheoryData<string> Cycles =>
        new()
        {
            "let $a := $b, $b := $a in $a",
            "let $x := $x + 1 in $x",
            "let $a := $b, $b := $c, $c := $a in $a",
            "let $x := $x in $x",
            "let $x := 5 in let $x := $x + 3 in $x",
        };

    [Theory]
    [MemberData(nameof(Cycles))]
    public void BasicEval_Cycle_ReturnsErrorNotStackOverflow(string src)
    {
        var (result, errors) = TestHelpers.CreateBasicEnv().EvalWithErrors(TestHelpers.Parse(src));
        Assert.Null(result.Value);
        Assert.Contains(errors, e => e.Contains("Circular reference"));
    }

    [Theory]
    [MemberData(nameof(Cycles))]
    public void PartialEval_Cycle_ReturnsError(string src)
    {
        var (result, errors) = TestHelpers
            .CreatePartialEnv()
            .EvalWithErrors(TestHelpers.Parse(src));
        Assert.Null(result.Value);
        Assert.Contains(errors, e => e.Contains("Circular reference"));
    }

    [Fact]
    public void BasicEval_Cycle_ErrorNamesVariable()
    {
        var (_, errors) = TestHelpers
            .CreateBasicEnv()
            .EvalWithErrors(TestHelpers.Parse("let $x := $x + 1 in $x"));
        Assert.Contains("Circular reference to $x", errors);
    }

    [Theory]
    [InlineData("let $a := $b + 1, $b := 2 in $a", 3)]
    [InlineData("let $a := $b + $b, $b := 2 in $a", 4)]
    [InlineData("let $a := $b + $c, $b := $c, $c := 1 in $a", 2)]
    public void BasicEval_ForwardReferences_StillEvaluate(string src, int expected)
    {
        var result = TestHelpers.CreateBasicEnv().EvalResult(TestHelpers.Parse(src));
        TestHelpers.AssertNumericEqual(expected, result.Value);
    }

    [Fact]
    public void BasicEval_ExceptionDuringBinding_DoesNotLeaveFalseCycle()
    {
        var env = EvalEnvFactory
            .BasicEnv(null)
            .NewScope(new Dictionary<string, EvalExpr> { ["a"] = new UnknownExpr() });

        Assert.Throws<ArgumentOutOfRangeException>(() => env.EvaluateExpr(new VarExpr("a")));
        // A retry must recompute rather than report a circular reference
        Assert.Throws<ArgumentOutOfRangeException>(() => env.EvaluateExpr(new VarExpr("a")));
    }

    [Fact]
    public void PartialEval_ExceptionDuringBinding_DoesNotLeaveFalseCycle()
    {
        var env = EvalEnvFactory
            .PartialEnv(null)
            .NewScope(new Dictionary<string, EvalExpr> { ["a"] = new UnknownExpr() });

        Assert.Throws<ArgumentOutOfRangeException>(() => env.EvaluateExpr(new VarExpr("a")));
        Assert.Throws<ArgumentOutOfRangeException>(() => env.EvaluateExpr(new VarExpr("a")));
    }

    /// <summary>An expression type no env knows how to evaluate, so evaluation throws.</summary>
    private record UnknownExpr(
        SourceLocation? Location = null,
        IReadOnlyDictionary<string, object?>? Data = null
    ) : EvalExpr;
}
