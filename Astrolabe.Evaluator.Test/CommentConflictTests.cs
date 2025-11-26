using System.Text.Json.Nodes;

namespace Astrolabe.Evaluator.Test;

/// <summary>
/// Tests to ensure comment syntax doesn't conflict with existing language features
/// </summary>
public class CommentConflictTests
{
    #region Division Operator

    [Fact]
    public void DivisionOperator_StillWorks()
    {
        var data = new JsonObject { ["a"] = 10, ["b"] = 2 };
        var result = TestHelpers.EvalExpr("a / b", data);
        TestHelpers.AssertNumericEqual(5, result);
    }

    [Fact]
    public void MultipleDivisions_StillWork()
    {
        var data = new JsonObject { ["a"] = 100, ["b"] = 5, ["c"] = 2 };
        var result = TestHelpers.EvalExpr("a / b / c", data);
        TestHelpers.AssertNumericEqual(10, result);
    }

    [Fact]
    public void DivisionWithSpaces_StillWorks()
    {
        var data = new JsonObject { ["a"] = 20, ["b"] = 4 };
        var result = TestHelpers.EvalExpr("a   /   b", data);
        TestHelpers.AssertNumericEqual(5, result);
    }

    #endregion

    #region Strings Containing Comment-Like Syntax

    [Fact]
    public void DoubleQuotedString_WithLineCommentSyntax()
    {
        var data = new JsonObject { ["text"] = "This is // not a comment" };
        var result = TestHelpers.EvalExpr("text", data);
        Assert.Equal("This is // not a comment", result);
    }

    [Fact]
    public void DoubleQuotedString_WithBlockCommentSyntax()
    {
        var data = new JsonObject { ["text"] = "This is /* not a comment */" };
        var result = TestHelpers.EvalExpr("text", data);
        Assert.Equal("This is /* not a comment */", result);
    }

    [Fact]
    public void SingleQuotedString_WithLineCommentSyntax()
    {
        var result = TestHelpers.EvalExpr("'This is // not a comment'");
        Assert.Equal("This is // not a comment", result);
    }

    [Fact]
    public void SingleQuotedString_WithBlockCommentSyntax()
    {
        var result = TestHelpers.EvalExpr("'This is /* not a comment */'");
        Assert.Equal("This is /* not a comment */", result);
    }

    #endregion

    #region Template Strings

    [Fact]
    public void TemplateString_WithCommentSyntaxLiteral()
    {
        var result = TestHelpers.EvalExpr("`This is // not a comment`");
        Assert.Equal("This is // not a comment", result);
    }

    [Fact]
    public void TemplateString_WithBlockCommentSyntaxLiteral()
    {
        var result = TestHelpers.EvalExpr("`This is /* not a comment */`");
        Assert.Equal("This is /* not a comment */", result);
    }

    #endregion

    #region Comments Around Division

    [Fact]
    public void LineComment_DoesNotBreakDivision()
    {
        var data = new JsonObject { ["a"] = 10, ["b"] = 2 };
        var result = TestHelpers.EvalExpr("a / b // this is division", data);
        TestHelpers.AssertNumericEqual(5, result);
    }

    [Fact]
    public void BlockComment_BeforeDivision()
    {
        var data = new JsonObject { ["a"] = 10, ["b"] = 2 };
        var result = TestHelpers.EvalExpr("a /* comment */ / b", data);
        TestHelpers.AssertNumericEqual(5, result);
    }

    [Fact]
    public void BlockComment_AfterDivision()
    {
        var data = new JsonObject { ["a"] = 10, ["b"] = 2 };
        var result = TestHelpers.EvalExpr("a / /* comment */ b", data);
        TestHelpers.AssertNumericEqual(5, result);
    }

    #endregion

    #region Multiplication with Asterisk

    [Fact]
    public void MultiplicationOperator_NotConfusedWithBlockComment()
    {
        var data = new JsonObject { ["a"] = 5, ["b"] = 3 };
        var result = TestHelpers.EvalExpr("a * b", data);
        TestHelpers.AssertNumericEqual(15, result);
    }

    [Fact]
    public void DivisionFollowedByMultiplication_NotConfusedWithComment()
    {
        var data = new JsonObject { ["a"] = 10, ["b"] = 2, ["c"] = 3 };
        var result = TestHelpers.EvalExpr("a / b * c", data);
        TestHelpers.AssertNumericEqual(15, result);
    }

    #endregion

    #region Edge Cases with Slashes and Asterisks

    [Fact]
    public void MultipleSlashesInExpression_WithComments()
    {
        var data = new JsonObject { ["a"] = 100, ["b"] = 5, ["c"] = 2 };
        var result = TestHelpers.EvalExpr("a / b / c // result is 10", data);
        TestHelpers.AssertNumericEqual(10, result);
    }

    [Fact]
    public void MixedOperators_WithComments()
    {
        var data = new JsonObject { ["a"] = 10, ["b"] = 2, ["c"] = 3 };
        var result = TestHelpers.EvalExpr(@"
            a /* first */
            / /* divide */
            b /* second */
            * /* multiply */
            c // result", data);
        TestHelpers.AssertNumericEqual(15, result);
    }

    [Fact]
    public void StringConcatenation_WithCommentLikeSyntax()
    {
        var result = TestHelpers.EvalExpr("$string('URL: ', 'http://example.com')");
        Assert.Equal("URL: http://example.com", result);
    }

    #endregion
}
