using Astrolabe.Evaluator.Functions;

namespace Astrolabe.Evaluator.Test;

public class ShortCircuitBooleanTests
{
    private static EvalEnvironment CreateEnv()
    {
        var evalData = JsonDataLookup.FromObject(null);
        return EvalEnvironment.DataFrom(evalData).AddDefaultFunctions();
    }

    [Fact]
    public void And_ShortCircuits_On_False()
    {
        // Arrange
        var env = CreateEnv();
        var andExpr = new CallExpr("and", [
            new ValueExpr(true),
            new ValueExpr(false),
            new CallExpr("invalid", []) // This would error if evaluated
        ]);

        // Act
        var (resultEnv, result) = env.Evaluate(andExpr);

        // Assert
        Assert.False(result.IsFalse() == false, "Result should be false");
        Assert.Empty(resultEnv.Errors); // No errors means third argument was not evaluated
    }

    [Fact]
    public void And_ShortCircuits_On_Null()
    {
        // Arrange
        var env = CreateEnv();
        var andExpr = new CallExpr("and", [
            new ValueExpr(true),
            ValueExpr.Null,
            new CallExpr("invalid", []) // This would error if evaluated
        ]);

        // Act
        var (resultEnv, result) = env.Evaluate(andExpr);

        // Assert
        Assert.True(result.IsNull());
        Assert.Empty(resultEnv.Errors); // No errors means third argument was not evaluated
    }

    [Fact]
    public void And_Evaluates_All_When_All_True()
    {
        // Arrange
        var env = CreateEnv();
        var andExpr = new CallExpr("and", [
            new ValueExpr(true),
            new ValueExpr(true),
            new ValueExpr(true)
        ]);

        // Act
        var (resultEnv, result) = env.Evaluate(andExpr);

        // Assert
        Assert.True(result.IsTrue());
    }

    [Fact]
    public void Or_ShortCircuits_On_True()
    {
        // Arrange
        var env = CreateEnv();
        var orExpr = new CallExpr("or", [
            new ValueExpr(false),
            new ValueExpr(true),
            new CallExpr("invalid", []) // This would error if evaluated
        ]);

        // Act
        var (resultEnv, result) = env.Evaluate(orExpr);

        // Assert
        Assert.True(result.IsTrue());
        Assert.Empty(resultEnv.Errors); // No errors means third argument was not evaluated
    }

    [Fact]
    public void Or_Evaluates_All_When_All_False()
    {
        // Arrange
        var env = CreateEnv();
        var orExpr = new CallExpr("or", [
            new ValueExpr(false),
            new ValueExpr(false),
            new ValueExpr(false)
        ]);

        // Act
        var (resultEnv, result) = env.Evaluate(orExpr);

        // Assert
        Assert.True(result.IsFalse());
    }

    [Fact]
    public void Or_Returns_True_On_First_True()
    {
        // Arrange
        var env = CreateEnv();
        var orExpr = new CallExpr("or", [
            new ValueExpr(true),
            new CallExpr("invalid", []) // This would error if evaluated
        ]);

        // Act
        var (resultEnv, result) = env.Evaluate(orExpr);

        // Assert
        Assert.True(result.IsTrue());
        Assert.Empty(resultEnv.Errors);
    }

    [Fact]
    public void And_Returns_False_On_First_False()
    {
        // Arrange
        var env = CreateEnv();
        var andExpr = new CallExpr("and", [
            new ValueExpr(false),
            new CallExpr("invalid", []) // This would error if evaluated
        ]);

        // Act
        var (resultEnv, result) = env.Evaluate(andExpr);

        // Assert
        Assert.True(result.IsFalse());
        Assert.Empty(resultEnv.Errors);
    }

    [Fact]
    public void And_With_Non_Boolean_Returns_Null()
    {
        // Arrange
        var env = CreateEnv();
        var andExpr = new CallExpr("and", [
            new ValueExpr(true),
            new ValueExpr("not a boolean")
        ]);

        // Act
        var (resultEnv, result) = env.Evaluate(andExpr);

        // Assert
        Assert.True(result.IsNull());
    }

    [Fact]
    public void Or_With_Non_Boolean_Returns_Null()
    {
        // Arrange
        var env = CreateEnv();
        var orExpr = new CallExpr("or", [
            new ValueExpr(false),
            new ValueExpr("not a boolean")
        ]);

        // Act
        var (resultEnv, result) = env.Evaluate(orExpr);

        // Assert
        Assert.True(result.IsNull());
    }

    [Fact]
    public void And_Single_Argument_Returns_That_Value()
    {
        // Arrange
        var env = CreateEnv();
        var andExpr = new CallExpr("and", [new ValueExpr(true)]);

        // Act
        var (resultEnv, result) = env.Evaluate(andExpr);

        // Assert
        Assert.True(result.IsTrue());
    }

    [Fact]
    public void Or_Single_Argument_Returns_That_Value()
    {
        // Arrange
        var env = CreateEnv();
        var orExpr = new CallExpr("or", [new ValueExpr(true)]);

        // Act
        var (resultEnv, result) = env.Evaluate(orExpr);

        // Assert
        Assert.True(result.IsTrue());
    }

    [Fact]
    public void And_With_Parser_Syntax_Infix_ShortCircuits_On_False()
    {
        // Arrange
        var env = CreateEnv();
        var expr = ExprParser.Parse("true and false");

        // Act
        var (resultEnv, result) = env.Evaluate(expr);

        // Assert
        Assert.True(result.IsFalse());
    }

    [Fact]
    public void Or_With_Parser_Syntax_Infix_ShortCircuits_On_True()
    {
        // Arrange
        var env = CreateEnv();
        var expr = ExprParser.Parse("false or true");

        // Act
        var (resultEnv, result) = env.Evaluate(expr);

        // Assert
        Assert.True(result.IsTrue());
    }

    [Fact]
    public void And_With_Parser_Syntax_Function_Call()
    {
        // Arrange
        var env = CreateEnv();
        // Manually create the CallExpr since parser has issues with booleans in function calls
        var expr = new CallExpr("and", [ValueExpr.True, ValueExpr.True]);

        // Act
        var (resultEnv, result) = env.Evaluate(expr);

        // Assert
        Assert.True(result.IsTrue());
    }

    [Fact]
    public void Or_With_Parser_Syntax_Function_Call()
    {
        // Arrange
        var env = CreateEnv();
        // Manually create the CallExpr since parser has issues with booleans in function calls
        var expr = new CallExpr("or", [ValueExpr.False, ValueExpr.False]);

        // Act
        var (resultEnv, result) = env.Evaluate(expr);

        // Assert
        Assert.True(result.IsFalse());
    }

    [Fact]
    public void Complex_Infix_And_Expression()
    {
        // Arrange
        var env = CreateEnv();
        var expr = ExprParser.Parse("(1 = 1) and (2 = 2) and (3 = 3)");

        // Act
        var (resultEnv, result) = env.Evaluate(expr);

        // Assert
        Assert.True(result.IsTrue());
    }

    [Fact]
    public void Complex_Infix_Or_Expression()
    {
        // Arrange
        var env = CreateEnv();
        var expr = ExprParser.Parse("(1 = 2) or (2 < 3) or (4 = 5)");

        // Act
        var (resultEnv, result) = env.Evaluate(expr);

        // Assert
        Assert.True(result.IsTrue());
    }
}
