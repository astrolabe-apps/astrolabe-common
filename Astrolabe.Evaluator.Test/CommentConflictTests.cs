using System.Text.Json.Nodes;
using Astrolabe.Evaluator.Functions;

namespace Astrolabe.Evaluator.Test;

/// <summary>
/// Tests to ensure comment syntax doesn't conflict with existing language features
/// </summary>
public class CommentConflictTests
{
    private static object? EvalExpr(string expr, JsonObject? data = null)
    {
        var evalData = JsonDataLookup.FromObject(data);
        var env = EvalEnvironment.DataFrom(evalData).AddDefaultFunctions();
        var parsed = ExprParser.Parse(expr);
        var (_, result) = env.Evaluate(parsed);
        return result.Value;
    }

    #region Division Operator

    [Fact]
    public void DivisionOperator_StillWorks()
    {
        var data = new JsonObject { ["a"] = 10, ["b"] = 2 };
        var result = EvalExpr("a / b", data);
        Assert.Equal(5.0, (double)result!, 0.0001);
    }

    [Fact]
    public void MultipleDivisions_StillWork()
    {
        var data = new JsonObject { ["a"] = 100, ["b"] = 5, ["c"] = 2 };
        var result = EvalExpr("a / b / c", data);
        Assert.Equal(10.0, (double)result!, 0.0001);
    }

    [Fact]
    public void DivisionWithSpaces_StillWorks()
    {
        var data = new JsonObject { ["a"] = 20, ["b"] = 4 };
        var result = EvalExpr("a   /   b", data);
        Assert.Equal(5.0, (double)result!, 0.0001);
    }

    #endregion

    #region Strings Containing Comment-Like Syntax

    [Fact]
    public void DoubleQuotedString_WithLineCommentSyntax()
    {
        var data = new JsonObject { ["text"] = "This is // not a comment" };
        var result = EvalExpr("text", data);
        Assert.Equal("This is // not a comment", result);
    }

    [Fact]
    public void DoubleQuotedString_WithBlockCommentSyntax()
    {
        var data = new JsonObject { ["text"] = "This is /* not a comment */" };
        var result = EvalExpr("text", data);
        Assert.Equal("This is /* not a comment */", result);
    }

    [Fact]
    public void SingleQuotedString_WithLineCommentSyntax()
    {
        var result = EvalExpr("'This is // not a comment'");
        Assert.Equal("This is // not a comment", result);
    }

    [Fact]
    public void SingleQuotedString_WithBlockCommentSyntax()
    {
        var result = EvalExpr("'This is /* not a comment */'");
        Assert.Equal("This is /* not a comment */", result);
    }

    #endregion

    #region Template Strings

    [Fact]
    public void TemplateString_WithCommentSyntaxLiteral()
    {
        var result = EvalExpr("`This is // not a comment`");
        Assert.Equal("This is // not a comment", result);
    }

    [Fact]
    public void TemplateString_WithBlockCommentSyntaxLiteral()
    {
        var result = EvalExpr("`This is /* not a comment */`");
        Assert.Equal("This is /* not a comment */", result);
    }

    #endregion

    #region Comments Around Division

    [Fact]
    public void LineComment_DoesNotBreakDivision()
    {
        var data = new JsonObject { ["a"] = 10, ["b"] = 2 };
        var result = EvalExpr("a / b // this is division", data);
        Assert.Equal(5.0, (double)result!, 0.0001);
    }

    [Fact]
    public void BlockComment_BeforeDivision()
    {
        var data = new JsonObject { ["a"] = 10, ["b"] = 2 };
        var result = EvalExpr("a /* comment */ / b", data);
        Assert.Equal(5.0, (double)result!, 0.0001);
    }

    [Fact]
    public void BlockComment_AfterDivision()
    {
        var data = new JsonObject { ["a"] = 10, ["b"] = 2 };
        var result = EvalExpr("a / /* comment */ b", data);
        Assert.Equal(5.0, (double)result!, 0.0001);
    }

    #endregion

    #region Multiplication with Asterisk

    [Fact]
    public void MultiplicationOperator_NotConfusedWithBlockComment()
    {
        var data = new JsonObject { ["a"] = 5, ["b"] = 3 };
        var result = EvalExpr("a * b", data);
        Assert.Equal(15L, result);
    }

    [Fact]
    public void DivisionFollowedByMultiplication_NotConfusedWithComment()
    {
        var data = new JsonObject { ["a"] = 10, ["b"] = 2, ["c"] = 3 };
        var result = EvalExpr("a / b * c", data);
        Assert.Equal(15.0, (double)result!, 0.0001);
    }

    #endregion

    #region Edge Cases with Slashes and Asterisks

    [Fact]
    public void MultipleSlashesInExpression_WithComments()
    {
        var data = new JsonObject { ["a"] = 100, ["b"] = 5, ["c"] = 2 };
        var result = EvalExpr("a / b / c // result is 10", data);
        Assert.Equal(10.0, (double)result!, 0.0001);
    }

    [Fact]
    public void MixedOperators_WithComments()
    {
        var data = new JsonObject { ["a"] = 10, ["b"] = 2, ["c"] = 3 };
        var result = EvalExpr(@"
            a /* first */
            / /* divide */
            b /* second */
            * /* multiply */
            c // result", data);
        Assert.Equal(15.0, (double)result!, 0.0001);
    }

    [Fact]
    public void StringConcatenation_WithCommentLikeSyntax()
    {
        var result = EvalExpr("$string('URL: ', 'http://example.com')");
        Assert.Equal("URL: http://example.com", result);
    }

    #endregion
}
