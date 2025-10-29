namespace Astrolabe.Evaluator.Test;

/// <summary>
/// Tests for source location tracking in the AST.
/// Verifies that all AST nodes have correct Start/End positions and SourceFile.
/// </summary>
public class SourceLocationTests
{
    #region Basic Literals

    [Fact]
    public void NumberLiteral_HasCorrectLocation()
    {
        var input = "42";
        var parsed = ExprParser.Parse(input);
        var value = Assert.IsType<ValueExpr>(parsed);
        Assert.NotNull(value.Location);
        Assert.Equal(0, value.Location.Start);
        Assert.Equal(2, value.Location.End);
    }

    [Fact]
    public void StringLiteral_HasCorrectLocation()
    {
        var input = "\"hello\"";
        var parsed = ExprParser.Parse(input);
        var value = Assert.IsType<ValueExpr>(parsed);
        Assert.NotNull(value.Location);
        Assert.Equal(0, value.Location.Start);
        Assert.Equal(7, value.Location.End);
    }

    [Fact]
    public void BooleanTrue_HasCorrectLocation()
    {
        var input = "true";
        var parsed = ExprParser.Parse(input);
        var value = Assert.IsType<ValueExpr>(parsed);
        Assert.NotNull(value.Location);
        Assert.Equal(0, value.Location.Start);
        Assert.Equal(4, value.Location.End);
    }

    [Fact]
    public void BooleanFalse_HasCorrectLocation()
    {
        var input = "false";
        var parsed = ExprParser.Parse(input);
        var value = Assert.IsType<ValueExpr>(parsed);
        Assert.NotNull(value.Location);
        Assert.Equal(0, value.Location.Start);
        Assert.Equal(5, value.Location.End);
    }

    [Fact]
    public void NullLiteral_HasCorrectLocation()
    {
        var input = "null";
        var parsed = ExprParser.Parse(input);
        var value = Assert.IsType<ValueExpr>(parsed);
        Assert.NotNull(value.Location);
        Assert.Equal(0, value.Location.Start);
        Assert.Equal(4, value.Location.End);
    }

    [Fact]
    public void PropertyIdentifier_HasCorrectLocation()
    {
        var input = "foo";
        var parsed = ExprParser.Parse(input);
        var property = Assert.IsType<PropertyExpr>(parsed);
        Assert.NotNull(property.Location);
        Assert.Equal(0, property.Location.Start);
        Assert.Equal(3, property.Location.End);
    }

    #endregion

    #region Variable References

    [Fact]
    public void VariableReference_HasCorrectLocation()
    {
        var input = "$x";
        var parsed = ExprParser.Parse(input);
        var varExpr = Assert.IsType<VarExpr>(parsed);
        Assert.NotNull(varExpr.Location);
        Assert.Equal(0, varExpr.Location.Start);
        Assert.Equal(2, varExpr.Location.End);
    }

    [Fact]
    public void LongVariableName_HasCorrectLocation()
    {
        var input = "$myVariable";
        var parsed = ExprParser.Parse(input);
        var varExpr = Assert.IsType<VarExpr>(parsed);
        Assert.NotNull(varExpr.Location);
        Assert.Equal(0, varExpr.Location.Start);
        Assert.Equal(11, varExpr.Location.End);
    }

    #endregion

    #region Binary Operations

    [Fact]
    public void Addition_HasCorrectLocation()
    {
        var input = "1 + 2";
        var parsed = ExprParser.Parse(input);
        var call = Assert.IsType<CallExpr>(parsed);
        Assert.NotNull(call.Location);
        Assert.Equal(0, call.Location.Start);
        Assert.Equal(5, call.Location.End);
    }

    [Fact]
    public void Multiplication_HasCorrectLocation()
    {
        var input = "a * b";
        var parsed = ExprParser.Parse(input);
        var call = Assert.IsType<CallExpr>(parsed);
        Assert.NotNull(call.Location);
        Assert.Equal(0, call.Location.Start);
        Assert.Equal(5, call.Location.End);
    }

    [Fact]
    public void Comparison_HasCorrectLocation()
    {
        var input = "x > y";
        var parsed = ExprParser.Parse(input);
        var call = Assert.IsType<CallExpr>(parsed);
        Assert.NotNull(call.Location);
        Assert.Equal(0, call.Location.Start);
        Assert.Equal(5, call.Location.End);
    }

    [Fact]
    public void LogicalAnd_HasCorrectLocation()
    {
        var input = "a and b";
        var parsed = ExprParser.Parse(input);
        var call = Assert.IsType<CallExpr>(parsed);
        Assert.NotNull(call.Location);
        Assert.Equal(0, call.Location.Start);
        Assert.Equal(7, call.Location.End);
    }

    [Fact]
    public void ComplexExpression_HasCorrectLocation()
    {
        var input = "x - y / z";
        var parsed = ExprParser.Parse(input);
        var call = Assert.IsType<CallExpr>(parsed);
        Assert.NotNull(call.Location);
        Assert.Equal(0, call.Location.Start);
        Assert.Equal(9, call.Location.End);
    }

    #endregion

    #region Unary Operations

    [Fact]
    public void LogicalNot_HasCorrectLocation()
    {
        var input = "!a";
        var parsed = ExprParser.Parse(input);
        var call = Assert.IsType<CallExpr>(parsed);
        Assert.NotNull(call.Location);
        Assert.Equal(0, call.Location.Start);
        Assert.Equal(2, call.Location.End);
    }

    [Fact]
    public void UnaryMinus_HasCorrectLocation()
    {
        var input = "-5";
        var parsed = ExprParser.Parse(input);
        var call = Assert.IsType<CallExpr>(parsed);
        Assert.NotNull(call.Location);
        Assert.Equal(0, call.Location.Start);
        Assert.Equal(2, call.Location.End);
    }

    #endregion

    #region Complex Expressions

    [Fact]
    public void ArrayLiteral_HasCorrectLocation()
    {
        var input = "[1, 2, 3]";
        var parsed = ExprParser.Parse(input);
        var array = Assert.IsType<ArrayExpr>(parsed);
        Assert.NotNull(array.Location);
        Assert.Equal(0, array.Location.Start);
        Assert.Equal(9, array.Location.End);
    }

    [Fact]
    public void ObjectLiteral_HasCorrectLocation()
    {
        var input = "{a: 1, b: 2}";
        var parsed = ExprParser.Parse(input);
        var call = Assert.IsType<CallExpr>(parsed);
        Assert.NotNull(call.Location);
        Assert.Equal(0, call.Location.Start);
        Assert.Equal(12, call.Location.End);
    }

    [Fact]
    public void FunctionCall_HasCorrectLocation()
    {
        var input = "$sum(1, 2, 3)";
        var parsed = ExprParser.Parse(input);
        var call = Assert.IsType<CallExpr>(parsed);
        Assert.NotNull(call.Location);
        Assert.Equal(0, call.Location.Start);
        Assert.Equal(13, call.Location.End);
    }

    [Fact]
    public void TemplateString_HasCorrectLocation()
    {
        var input = "`hello ${name}`";
        var parsed = ExprParser.Parse(input);
        // Can be either CallExpr or ValueExpr depending on content
        Assert.NotNull(parsed);
        if (parsed is CallExpr call)
        {
            Assert.NotNull(call.Location);
            Assert.Equal(0, call.Location.Start);
            Assert.Equal(15, call.Location.End);
        }
        else if (parsed is ValueExpr value)
        {
            Assert.NotNull(value.Location);
            Assert.Equal(0, value.Location.Start);
            Assert.Equal(15, value.Location.End);
        }
    }

    [Fact]
    public void TernaryOperator_HasCorrectLocation()
    {
        var input = "a ? b : c";
        var parsed = ExprParser.Parse(input);
        var call = Assert.IsType<CallExpr>(parsed);
        Assert.NotNull(call.Location);
        Assert.Equal(0, call.Location.Start);
        Assert.Equal(9, call.Location.End);
    }

    #endregion

    #region Nested Expressions

    [Fact]
    public void ParenthesizedExpression_PreservesInnerLocation()
    {
        var input = "(a + b)";
        var parsed = ExprParser.Parse(input);
        var call = Assert.IsType<CallExpr>(parsed);
        // The parentheses are stripped, so we get the inner expression
        Assert.NotNull(call.Location);
        Assert.Equal(1, call.Location.Start);
        Assert.Equal(6, call.Location.End);
    }

    [Fact]
    public void LetExpression_HasCorrectLocation()
    {
        var input = "let $x := 1 in $x + 2";
        var parsed = ExprParser.Parse(input);
        var letExpr = Assert.IsType<LetExpr>(parsed);
        Assert.NotNull(letExpr.Location);
        Assert.Equal(0, letExpr.Location.Start);
        Assert.Equal(21, letExpr.Location.End);
    }

    [Fact]
    public void LambdaExpression_HasCorrectLocation()
    {
        var input = "$x => $x + 1";
        var parsed = ExprParser.Parse(input);
        var lambda = Assert.IsType<LambdaExpr>(parsed);
        Assert.NotNull(lambda.Location);
        Assert.Equal(0, lambda.Location.Start);
        Assert.Equal(12, lambda.Location.End);
    }

    [Fact]
    public void NestedBinaryOperations_HaveLocations()
    {
        var input = "(a + b) * c";
        var parsed = ExprParser.Parse(input);
        var call = Assert.IsType<CallExpr>(parsed);
        Assert.NotNull(call.Location);
        Assert.Equal(0, call.Location.Start);
        Assert.Equal(11, call.Location.End);

        // Check the nested addition
        var leftArg = Assert.IsType<CallExpr>(call.Args[0]);
        Assert.NotNull(leftArg.Location);
        Assert.Equal(1, leftArg.Location.Start);
        Assert.Equal(6, leftArg.Location.End);
    }

    #endregion

    #region Source File

    [Fact]
    public void SourceFile_IsNullWhenNotProvided()
    {
        var input = "42";
        var parsed = ExprParser.Parse(input);
        var value = Assert.IsType<ValueExpr>(parsed);
        Assert.NotNull(value.Location);
        Assert.Null(value.Location.SourceFile);
    }

    [Fact]
    public void SourceFile_IsSetWhenProvided()
    {
        var input = "42";
        var parsed = ExprParser.Parse(input, sourceFile: "test.expr");
        var value = Assert.IsType<ValueExpr>(parsed);
        Assert.NotNull(value.Location);
        Assert.Equal("test.expr", value.Location.SourceFile);
    }

    [Fact]
    public void SourceFile_PropagatesToNestedExpressions()
    {
        var input = "a + b";
        var parsed = ExprParser.Parse(input, sourceFile: "myfile.expr");
        var call = Assert.IsType<CallExpr>(parsed);
        Assert.NotNull(call.Location);
        Assert.Equal("myfile.expr", call.Location.SourceFile);

        // Check nested property expressions
        var leftArg = Assert.IsType<PropertyExpr>(call.Args[0]);
        Assert.NotNull(leftArg.Location);
        Assert.Equal("myfile.expr", leftArg.Location.SourceFile);

        var rightArg = Assert.IsType<PropertyExpr>(call.Args[1]);
        Assert.NotNull(rightArg.Location);
        Assert.Equal("myfile.expr", rightArg.Location.SourceFile);
    }

    [Fact]
    public void SourceFile_PropagatesToDeeplyNestedExpressions()
    {
        var input = "let $x := 1 in $x + 2";
        var parsed = ExprParser.Parse(input, sourceFile: "nested.expr");
        var letExpr = Assert.IsType<LetExpr>(parsed);
        Assert.NotNull(letExpr.Location);
        Assert.Equal("nested.expr", letExpr.Location.SourceFile);

        // Check the inner expression
        var innerExpr = Assert.IsType<CallExpr>(letExpr.In);
        Assert.NotNull(innerExpr.Location);
        Assert.Equal("nested.expr", innerExpr.Location.SourceFile);
    }

    #endregion

    #region Multi-line Expressions

    [Fact]
    public void MultiLineExpression_HasCorrectSpan()
    {
        var input = "a +\nb";
        var parsed = ExprParser.Parse(input);
        var call = Assert.IsType<CallExpr>(parsed);
        Assert.NotNull(call.Location);
        Assert.Equal(0, call.Location.Start);
        Assert.Equal(5, call.Location.End);
    }

    [Fact]
    public void MultiLineWithComplexNesting_HasCorrectSpan()
    {
        var input = "let $x := 1\nin $x + 2";
        var parsed = ExprParser.Parse(input);
        var letExpr = Assert.IsType<LetExpr>(parsed);
        Assert.NotNull(letExpr.Location);
        Assert.Equal(0, letExpr.Location.Start);
        Assert.Equal(21, letExpr.Location.End);
    }

    #endregion

    #region Edge Cases

    [Fact]
    public void EmptyArray_HasCorrectLocation()
    {
        var input = "[]";
        var parsed = ExprParser.Parse(input);
        var array = Assert.IsType<ArrayExpr>(parsed);
        Assert.NotNull(array.Location);
        Assert.Equal(0, array.Location.Start);
        Assert.Equal(2, array.Location.End);
    }

    [Fact]
    public void EmptyObject_HasCorrectLocation()
    {
        var input = "{}";
        var parsed = ExprParser.Parse(input);
        var call = Assert.IsType<CallExpr>(parsed);
        Assert.NotNull(call.Location);
        Assert.Equal(0, call.Location.Start);
        Assert.Equal(2, call.Location.End);
    }

    [Fact]
    public void Whitespace_IsNotIncludedInLocation()
    {
        var input = "  42  ";
        var parsed = ExprParser.Parse(input);
        var value = Assert.IsType<ValueExpr>(parsed);
        Assert.NotNull(value.Location);
        // Location should be for the number itself, not including leading/trailing whitespace
        Assert.Equal(2, value.Location.Start);
        Assert.Equal(4, value.Location.End);
    }

    #endregion
}
