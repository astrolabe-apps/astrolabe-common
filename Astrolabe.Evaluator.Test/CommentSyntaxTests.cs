using System.Text.Json.Nodes;
using Astrolabe.Evaluator.Functions;

namespace Astrolabe.Evaluator.Test;

/// <summary>
/// Tests for comment syntax support in the evaluator.
/// Tests both line comments (//) and block comments (/* */)
/// </summary>
public class CommentSyntaxTests
{
    private static object? EvalExpr(string expr, JsonObject? data = null)
    {
        var evalData = JsonDataLookup.FromObject(data);
        var env = EvalEnvironment.DataFrom(evalData).AddDefaultFunctions();
        var parsed = ExprParser.Parse(expr);
        var (_, result) = env.Evaluate(parsed);
        return result.Value;
    }

    #region Line Comments

    [Fact]
    public void LineComment_AfterExpression()
    {
        var data = new JsonObject { ["a"] = 5, ["b"] = 3 };
        var result = EvalExpr("a + b // this is a comment", data);
        Assert.Equal(8L, result);
    }

    [Fact]
    public void LineComment_BeforeNewlineAndContinuation()
    {
        var data = new JsonObject { ["a"] = 5, ["b"] = 3, ["c"] = 2 };
        var result = EvalExpr("a + b // add a and b\n+ c", data);
        Assert.Equal(10L, result);
    }

    [Fact]
    public void LineComment_InMiddleOfExpression()
    {
        var data = new JsonObject { ["a"] = 10, ["b"] = 5, ["c"] = 2 };
        var result = EvalExpr("(a // first value\n- b) // subtract b\n* c", data);
        Assert.Equal(10L, result); // (a - b) * c = (10 - 5) * 2 = 10
    }

    [Fact]
    public void LineComment_WithConditionalExpression()
    {
        var data = new JsonObject { ["x"] = 10, ["y"] = 5 };
        var result = EvalExpr("x > y // check if x is greater\n? x // return x\n: y // return y", data);
        Assert.Equal(10, result);
    }

    #endregion

    #region Block Comments

    [Fact]
    public void BlockComment_BeforeExpression()
    {
        var data = new JsonObject { ["a"] = 5, ["b"] = 3 };
        var result = EvalExpr("/* calculate sum */ a + b", data);
        Assert.Equal(8L, result);
    }

    [Fact]
    public void BlockComment_AfterExpression()
    {
        var data = new JsonObject { ["a"] = 5, ["b"] = 3 };
        var result = EvalExpr("a + b /* sum of a and b */", data);
        Assert.Equal(8L, result);
    }

    [Fact]
    public void BlockComment_InMiddleOfExpression()
    {
        var data = new JsonObject { ["a"] = 5, ["b"] = 3 };
        var result = EvalExpr("a /* first value */ + /* operator */ b", data);
        Assert.Equal(8L, result);
    }

    [Fact]
    public void BlockComment_Multiline()
    {
        var data = new JsonObject { ["a"] = 5, ["b"] = 3 };
        var result = EvalExpr(@"a + b /* this is a
        multiline
        comment */", data);
        Assert.Equal(8L, result);
    }

    [Fact]
    public void BlockComment_WithDivisionOperator()
    {
        var data = new JsonObject { ["a"] = 10, ["b"] = 2 };
        var result = EvalExpr("a /* divide */ / b", data);
        Assert.Equal(5.0, (double)result!, 0.0001);
    }

    [Fact]
    public void BlockComment_MultipleSeparateComments()
    {
        var data = new JsonObject { ["a"] = 10, ["b"] = 3, ["c"] = 2 };
        var result = EvalExpr("/* first */ a + /* second */ b - /* third */ c", data);
        Assert.Equal(11L, result);
    }

    #endregion

    #region Mixed Comments

    [Fact]
    public void MixedComments_LineAndBlock()
    {
        var data = new JsonObject { ["a"] = 5, ["b"] = 3 };
        var result = EvalExpr("/* block comment */ a + b // line comment", data);
        Assert.Equal(8L, result);
    }

    [Fact]
    public void MixedComments_ComplexExpression()
    {
        var data = new JsonObject { ["x"] = 10, ["y"] = 5, ["z"] = 2 };
        var result = EvalExpr(@"
            /* Calculate a complex expression */
            x // start with x
            * y // multiply by y
            / /* divide by */ z // z value
        ", data);
        Assert.Equal(25.0, (double)result!, 0.0001);
    }

    #endregion

    #region Comments with Different Expression Types

    [Fact]
    public void Comments_WithLetExpression()
    {
        var result = EvalExpr(@"
            /* define variables */
            let $a := 5, // first var
                $b := 3  /* second var */
            in $a + $b // return sum
        ");
        Assert.Equal(8.0, (double)result!, 0.0001);
    }

    [Fact]
    public void Comments_WithLambdaExpression()
    {
        var data = new JsonObject { ["nums"] = new JsonArray(1, 2, 3, 4, 5) };
        var result = EvalExpr(@"
            nums[/* filter */ $i => $this() > 2 // greater than 2
            ]
        ", data);
        var array = (ArrayValue)result!;
        var values = array.Values.Select(v => v.AsLong()).ToList();
        Assert.Equal(new[] { 3L, 4L, 5L }, values);
    }

    [Fact]
    public void Comments_WithFunctionCall()
    {
        var data = new JsonObject { ["nums"] = new JsonArray(1, 2, 3, 4, 5) };
        var result = EvalExpr(@"
            $sum(/* array parameter */ nums) // calculate sum
        ", data);
        Assert.Equal(15.0, result);
    }

    [Fact]
    public void Comments_WithArrayLiteral()
    {
        var result = EvalExpr(@"
            [
                1, // first
                2, /* second */
                3  // third
            ]
        ");
        var array = (ArrayValue)result!;
        var values = array.Values.Select(v => v.AsLong()).ToList();
        Assert.Equal(new[] { 1L, 2L, 3L }, values);
    }

    [Fact]
    public void Comments_WithObjectLiteral()
    {
        var result = EvalExpr("$object(\"a\", 1, \"b\", 2) /* create object */");
        var obj = (ObjectValue)result!;
        Assert.Equal(1.0, obj.Properties["a"].Value);
        Assert.Equal(2.0, obj.Properties["b"].Value);
    }

    [Fact]
    public void Comments_WithTemplateString()
    {
        var result = EvalExpr("`Hello /* comment */ World` // template string");
        Assert.Equal("Hello /* comment */ World", result);
    }

    #endregion

    #region Edge Cases

    [Fact]
    public void Comments_EmptyBlockComment()
    {
        var data = new JsonObject { ["a"] = 5, ["b"] = 3 };
        var result = EvalExpr("a /**/ + /**/ b", data);
        Assert.Equal(8L, result);
    }

    [Fact]
    public void Comments_LineCommentAtEndOfInput()
    {
        var data = new JsonObject { ["a"] = 5 };
        var result = EvalExpr("a // comment at end", data);
        Assert.Equal(5, result);
    }

    [Fact]
    public void Comments_OnlyWhitespaceAfterLineComment()
    {
        var data = new JsonObject { ["a"] = 5 };
        var result = EvalExpr("a // comment\n   ", data);
        Assert.Equal(5, result);
    }

    [Fact]
    public void Comments_BlockCommentWithAsterisk()
    {
        var data = new JsonObject { ["a"] = 5 };
        var result = EvalExpr("a /* ** */ ", data);
        Assert.Equal(5, result);
    }

    #endregion
}
