namespace Astrolabe.Evaluator.Test;

public class FreeVariablesTests
{
    [Theory]
    [InlineData("let $a := $b + 1, $b := $c in $a + $d", "c,d")]
    [InlineData("let $b := 1, $a := $b in $a", "")]
    [InlineData("items[$i => $i > $Max]", "Max")]
    [InlineData("$sum(axles.spacing) + $elem($X, 1)", "X")]
    [InlineData("`a {$T} b`", "T")]
    [InlineData("let $x := 1 in $x + $y", "y")]
    [InlineData("let $ROH := $Other in { \"ROH\": $ROH }", "Other")]
    [InlineData("let $x := $x + 1 in $x", "")]
    [InlineData("let $a := let $b := $c in $b in $a + $b", "b,c")]
    public void FreeVariables_MatchesLetSemantics(string src, string expected)
    {
        var free = PartialEvaluation.FreeVariables(TestHelpers.Parse(src));
        Assert.Equal(expected, string.Join(",", free.Order()));
    }

    [Fact]
    public void FreeVariables_RespectsBoundParameter()
    {
        var free = PartialEvaluation.FreeVariables(TestHelpers.Parse("$a + $b"), ["a"]);
        Assert.Equal(["b"], free);
    }
}
