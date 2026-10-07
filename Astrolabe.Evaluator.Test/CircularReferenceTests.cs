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

    public static TheoryData<string> EnvKinds => new() { "basic", "partial" };

    [Theory]
    [MemberData(nameof(EnvKinds))]
    public void SharedEnv_ConcurrentEvaluation_DoesNotReportFalseCycle(string kind)
    {
        // Several threads read the same slow variable from one shared env at once, as a
        // caller does when it evaluates many expressions concurrently against one env
        FunctionHandler slow = (_, _) =>
        {
            Thread.Sleep(50);
            return new ValueExpr(1);
        };
        var vars = new Dictionary<string, EvalExpr>
        {
            ["slow"] = new ValueExpr(slow),
            ["shared"] = TestHelpers.Parse("$slow()"),
        };
        EvalEnv env =
            kind == "basic"
                ? EvalEnvFactory.BasicEnv(null).NewScope(vars)
                : EvalEnvFactory.PartialEnv(null).NewScope(vars);

        const int threadCount = 8;
        var barrier = new Barrier(threadCount);
        var results = new EvalExpr[threadCount];
        var threads = Enumerable
            .Range(0, threadCount)
            .Select(i => new Thread(() =>
            {
                barrier.SignalAndWait();
                results[i] = env.EvaluateExpr(TestHelpers.Parse("$shared + 1"));
            }))
            .ToList();
        threads.ForEach(t => t.Start());
        threads.ForEach(t => t.Join());

        Assert.All(
            results,
            r =>
            {
                var value = Assert.IsType<ValueExpr>(r);
                Assert.Empty(ValueExpr.CollectAllErrors(value));
                TestHelpers.AssertNumericEqual(2, value.Value);
            }
        );
    }

    /// <summary>An expression type no env knows how to evaluate, so evaluation throws.</summary>
    private record UnknownExpr(
        SourceLocation? Location = null,
        IReadOnlyDictionary<string, object?>? Data = null
    ) : EvalExpr;
}
