namespace Astrolabe.Evaluator.Test;

/// <summary>
/// Tests for PrintExpr - verifies that expressions are printed correctly
/// and can be round-tripped through the parser.
/// </summary>
public class PrintExprTests
{
    private static void TestRoundTrip(string input)
    {
        var parsed1 = ExprParser.Parse(input);
        var printed = parsed1.Print();
        var parsed2 = ExprParser.Parse(printed);

        // Use ToNormalString for comparison as it provides canonical representation
        Assert.Equal(parsed1.ToNormalString(), parsed2.ToNormalString());
    }

    [Fact]
    public void RoundTrips_SimpleExpressions()
    {
        TestRoundTrip("42");
        TestRoundTrip("true");
        TestRoundTrip("false");
        TestRoundTrip("null");
        TestRoundTrip("\"hello\"");
        TestRoundTrip("myProp");
        TestRoundTrip("$myVar");
    }

    [Fact]
    public void RoundTrips_StringWithEscapes()
    {
        TestRoundTrip("\"hello\\nworld\"");
        TestRoundTrip("\"say \\\"hi\\\"\"");
        TestRoundTrip("\"back\\\\slash\"");
        TestRoundTrip("\"tab\\there\"");
    }

    [Fact]
    public void RoundTrips_Arrays()
    {
        TestRoundTrip("[1, 2, 3]");
        TestRoundTrip("[]");
        TestRoundTrip("[\"a\", \"b\", \"c\"]");
    }

    [Fact]
    public void RoundTrips_Lambdas()
    {
        TestRoundTrip("$x => $x");
        TestRoundTrip("$x => $x + 1");
        TestRoundTrip("$n => $n * 2");
    }

    [Fact]
    public void RoundTrips_LetExpressions()
    {
        TestRoundTrip("let $x := 5 in $x");
        TestRoundTrip("let $x := 1, $y := 2 in $x + $y");
        TestRoundTrip("let $a := 10, $b := 20, $c := 30 in $a + $b + $c");
    }

    [Fact]
    public void RoundTrips_BinaryOperators()
    {
        TestRoundTrip("1 + 2");
        TestRoundTrip("5 - 3");
        TestRoundTrip("3 * 4");
        TestRoundTrip("10 / 2");
        TestRoundTrip("x = y");
        TestRoundTrip("x != y");
        TestRoundTrip("x < y");
        TestRoundTrip("x > y");
        TestRoundTrip("x <= y");
        TestRoundTrip("x >= y");
        TestRoundTrip("true and false");
        TestRoundTrip("true or false");
    }

    [Fact]
    public void RoundTrips_PropertyAccessAndFilter()
    {
        TestRoundTrip("obj.field");
        TestRoundTrip("arr[0]");
        TestRoundTrip("user.name");
    }

    [Fact]
    public void RoundTrips_TernaryOperator()
    {
        TestRoundTrip("x > 0 ? 1 : -1");
        TestRoundTrip("valid ? value : default");
    }

    [Fact]
    public void RoundTrips_ObjectLiterals()
    {
        TestRoundTrip("{}");
        TestRoundTrip("{name: \"John\"}");
        TestRoundTrip("{name: \"John\", age: 30}");
        TestRoundTrip("{x: 1, y: 2, z: 3}");
        TestRoundTrip("{\"a\": 1, \"b\": 1}"); // quoted keys
    }

    [Fact]
    public void RoundTrips_TemplateStrings()
    {
        TestRoundTrip("`Hello {name}`");
        TestRoundTrip("`User: {name}, Age: {age}`");
        TestRoundTrip("`Count: {x + 1}`");
    }

    [Fact]
    public void RoundTrips_ComplexExpressionsWithPrecedence()
    {
        TestRoundTrip("1 + 2 * 3");
        TestRoundTrip("(1 + 2) * 3");
        TestRoundTrip("x + 1 < 10");
        TestRoundTrip("x > 0 and x < 10");
        TestRoundTrip("10 - 5 - 3");
        TestRoundTrip("10 - (5 - 3)");
    }

    [Fact]
    public void RoundTrips_NestedExpressions()
    {
        TestRoundTrip("obj.field.subfield");
        TestRoundTrip("arr[0][1]");
        TestRoundTrip("$f($g($x))");
        TestRoundTrip("let $x := let $y := 1 in $y in $x");
    }

    [Fact]
    public void RoundTrips_MixedComplexExpressions()
    {
        TestRoundTrip("let $x := 5, $y := 10 in $x + $y * 2");
        TestRoundTrip("($x => $x + 1)(5)");
        TestRoundTrip("{x: 1, y: 2}.x");
        TestRoundTrip("[1, 2, 3][0]");
        TestRoundTrip("x > 0 ? {value: x} : {value: 0}");
    }

    [Fact]
    public void Prints_NullValue()
    {
        var expr = new ValueExpr(null);
        Assert.Equal("null", expr.Print());
    }

    [Fact]
    public void Prints_BooleanTrue()
    {
        var expr = new ValueExpr(true);
        Assert.Equal("true", expr.Print());
    }

    [Fact]
    public void Prints_BooleanFalse()
    {
        var expr = new ValueExpr(false);
        Assert.Equal("false", expr.Print());
    }

    [Fact]
    public void Prints_Number()
    {
        var expr = new ValueExpr(42);
        Assert.Equal("42", expr.Print());
    }

    [Fact]
    public void Prints_SimpleString()
    {
        var expr = new ValueExpr("hello");
        Assert.Equal("\"hello\"", expr.Print());
    }

    [Fact]
    public void Prints_Property()
    {
        var expr = new PropertyExpr("myProp");
        Assert.Equal("myProp", expr.Print());
    }

    [Fact]
    public void Prints_Variable()
    {
        var expr = new VarExpr("myVar");
        Assert.Equal("$myVar", expr.Print());
    }

    [Fact]
    public void Prints_Array()
    {
        var expr = new ArrayExpr([
            new ValueExpr(1),
            new ValueExpr(2),
            new ValueExpr(3)
        ]);
        Assert.Equal("[1, 2, 3]", expr.Print());
    }

    [Fact]
    public void Prints_EmptyArray()
    {
        var expr = new ArrayExpr([]);
        Assert.Equal("[]", expr.Print());
    }

    [Fact]
    public void Escapes_Backslash()
    {
        var expr = new ValueExpr("hello\\world");
        Assert.Equal("\"hello\\\\world\"", expr.Print());
    }

    [Fact]
    public void Escapes_DoubleQuotes()
    {
        var expr = new ValueExpr("say \"hi\"");
        Assert.Equal("\"say \\\"hi\\\"\"", expr.Print());
    }

    [Fact]
    public void Escapes_Newline()
    {
        var expr = new ValueExpr("hello\nworld");
        Assert.Equal("\"hello\\nworld\"", expr.Print());
    }

    [Fact]
    public void Escapes_Tab()
    {
        var expr = new ValueExpr("hello\tworld");
        Assert.Equal("\"hello\\tworld\"", expr.Print());
    }

    [Fact]
    public void Escapes_CarriageReturn()
    {
        var expr = new ValueExpr("hello\rworld");
        Assert.Equal("\"hello\\rworld\"", expr.Print());
    }

    [Fact]
    public void Escapes_MultipleSpecialCharacters()
    {
        var expr = new ValueExpr("line1\nline2\t\"quoted\"\\backslash");
        Assert.Equal("\"line1\\nline2\\t\\\"quoted\\\"\\\\backslash\"", expr.Print());
    }

    [Fact]
    public void Prints_SimpleLambda()
    {
        var expr = new LambdaExpr("x", new VarExpr("x"));
        Assert.Equal("$x => $x", expr.Print());
    }

    [Fact]
    public void Prints_LambdaWithComputation()
    {
        var expr = new LambdaExpr(
            "x",
            new CallExpr("+", [new VarExpr("x"), new ValueExpr(1)])
        );
        Assert.Equal("$x => $x + 1", expr.Print());
    }

    [Fact]
    public void Prints_LetWithSingleVariable()
    {
        var expr = new LetExpr(
            [(new VarExpr("x"), new ValueExpr(5))],
            new VarExpr("x")
        );
        Assert.Equal("let $x := 5 in $x", expr.Print());
    }

    [Fact]
    public void Prints_LetWithMultipleVariables()
    {
        var expr = new LetExpr(
            [
                (new VarExpr("x"), new ValueExpr(1)),
                (new VarExpr("y"), new ValueExpr(2))
            ],
            new CallExpr("+", [new VarExpr("x"), new VarExpr("y")])
        );
        Assert.Equal("let $x := 1, $y := 2 in $x + $y", expr.Print());
    }

    [Fact]
    public void Prints_LetWithZeroVariables()
    {
        var expr = new LetExpr([], new ValueExpr(42));
        Assert.Equal("42", expr.Print());
    }

    [Fact]
    public void Prints_Addition()
    {
        var expr = new CallExpr("+", [new ValueExpr(1), new ValueExpr(2)]);
        Assert.Equal("1 + 2", expr.Print());
    }

    [Fact]
    public void Prints_Subtraction()
    {
        var expr = new CallExpr("-", [new ValueExpr(5), new ValueExpr(3)]);
        Assert.Equal("5 - 3", expr.Print());
    }

    [Fact]
    public void Prints_Multiplication()
    {
        var expr = new CallExpr("*", [new ValueExpr(3), new ValueExpr(4)]);
        Assert.Equal("3 * 4", expr.Print());
    }

    [Fact]
    public void Prints_Division()
    {
        var expr = new CallExpr("/", [new ValueExpr(10), new ValueExpr(2)]);
        Assert.Equal("10 / 2", expr.Print());
    }

    [Fact]
    public void Prints_ComparisonOperators()
    {
        Assert.Equal("1 = 1",
            new CallExpr("=", [new ValueExpr(1), new ValueExpr(1)]).Print());
        Assert.Equal("1 != 2",
            new CallExpr("!=", [new ValueExpr(1), new ValueExpr(2)]).Print());
        Assert.Equal("1 < 2",
            new CallExpr("<", [new ValueExpr(1), new ValueExpr(2)]).Print());
        Assert.Equal("2 > 1",
            new CallExpr(">", [new ValueExpr(2), new ValueExpr(1)]).Print());
    }

    [Fact]
    public void Prints_LogicalOperators()
    {
        Assert.Equal("true and false",
            new CallExpr("and", [new ValueExpr(true), new ValueExpr(false)]).Print());
        Assert.Equal("true or false",
            new CallExpr("or", [new ValueExpr(true), new ValueExpr(false)]).Print());
    }

    [Fact]
    public void Prints_PropertyAccess()
    {
        var expr = new CallExpr(".", [
            new PropertyExpr("obj"),
            new PropertyExpr("field")
        ]);
        Assert.Equal("obj.field", expr.Print());
    }

    [Fact]
    public void Prints_ArrayFilter()
    {
        var expr = new CallExpr("[", [
            new PropertyExpr("arr"),
            new ValueExpr(0)
        ]);
        Assert.Equal("arr[0]", expr.Print());
    }

    [Fact]
    public void Prints_TernaryExpression()
    {
        var expr = new CallExpr("?", [
            new CallExpr(">", [new PropertyExpr("x"), new ValueExpr(0)]),
            new ValueExpr(1),
            new ValueExpr(-1)
        ]);
        Assert.Equal("x > 0 ? 1 : -1", expr.Print());
    }

    [Fact]
    public void Prints_EmptyObject()
    {
        var expr = new CallExpr("object", []);
        Assert.Equal("{}", expr.Print());
    }

    [Fact]
    public void Prints_ObjectWithSingleProperty()
    {
        var expr = new CallExpr("object", [
            new ValueExpr("name"),
            new ValueExpr("John")
        ]);
        Assert.Equal("{\"name\": \"John\"}", expr.Print());
    }

    [Fact]
    public void Prints_ObjectWithMultipleProperties()
    {
        var expr = new CallExpr("object", [
            new ValueExpr("name"),
            new ValueExpr("John"),
            new ValueExpr("age"),
            new ValueExpr(30)
        ]);
        Assert.Equal("{\"name\": \"John\", \"age\": 30}", expr.Print());
    }

    [Fact]
    public void Prints_TemplateStringWithSingleInterpolation()
    {
        var expr = new CallExpr("string", [
            new ValueExpr("Hello "),
            new PropertyExpr("name")
        ]);
        Assert.Equal("`Hello {name}`", expr.Print());
    }

    [Fact]
    public void Prints_TemplateStringWithMultipleInterpolations()
    {
        var expr = new CallExpr("string", [
            new ValueExpr("User: "),
            new PropertyExpr("name"),
            new ValueExpr(", Age: "),
            new PropertyExpr("age")
        ]);
        Assert.Equal("`User: {name}, Age: {age}`", expr.Print());
    }

    [Fact]
    public void Prints_TemplateStringEscapesBackticks()
    {
        var expr = new CallExpr("string", [
            new ValueExpr("Use ` for code"),
            new PropertyExpr("x")
        ]);
        Assert.Equal("`Use \\` for code{x}`", expr.Print());
    }

    [Fact]
    public void Prints_MultiplicationWithHigherPrecedenceThanAddition()
    {
        var expr = new CallExpr("+", [
            new ValueExpr(1),
            new CallExpr("*", [new ValueExpr(2), new ValueExpr(3)])
        ]);
        Assert.Equal("1 + 2 * 3", expr.Print());
    }

    [Fact]
    public void AddsParentheses_WhenNeededForPrecedence()
    {
        var expr = new CallExpr("*", [
            new CallExpr("+", [new ValueExpr(1), new ValueExpr(2)]),
            new ValueExpr(3)
        ]);
        Assert.Equal("(1 + 2) * 3", expr.Print());
    }

    [Fact]
    public void Prints_ComparisonWithLowerPrecedenceThanArithmetic()
    {
        var expr = new CallExpr("<", [
            new CallExpr("+", [new PropertyExpr("x"), new ValueExpr(1)]),
            new ValueExpr(10)
        ]);
        Assert.Equal("x + 1 < 10", expr.Print());
    }

    [Fact]
    public void Prints_LogicalOperatorsWithLowestPrecedence()
    {
        var expr = new CallExpr("and", [
            new CallExpr(">", [new PropertyExpr("x"), new ValueExpr(0)]),
            new CallExpr("<", [new PropertyExpr("x"), new ValueExpr(10)])
        ]);
        Assert.Equal("x > 0 and x < 10", expr.Print());
    }

    [Fact]
    public void AddsParentheses_ForLogicalOperatorsInComparison()
    {
        var expr = new CallExpr("<", [
            new CallExpr("and", [new PropertyExpr("x"), new PropertyExpr("y")]),
            new ValueExpr(10)
        ]);
        Assert.Equal("(x and y) < 10", expr.Print());
    }

    [Fact]
    public void Prints_LeftAssociativity_ForSamePrecedenceOperators()
    {
        var expr = new CallExpr("-", [
            new CallExpr("-", [new ValueExpr(10), new ValueExpr(5)]),
            new ValueExpr(3)
        ]);
        Assert.Equal("10 - 5 - 3", expr.Print());
    }

    [Fact]
    public void AddsParentheses_WhenBreakingLeftAssociativity()
    {
        var expr = new CallExpr("-", [
            new ValueExpr(10),
            new CallExpr("-", [new ValueExpr(5), new ValueExpr(3)])
        ]);
        Assert.Equal("10 - (5 - 3)", expr.Print());
    }

    [Fact]
    public void Prints_CustomFunctionCall()
    {
        var expr = new CallExpr("myFunc", [new ValueExpr(1), new ValueExpr(2)]);
        Assert.Equal("$myFunc(1, 2)", expr.Print());
    }

    [Fact]
    public void Prints_FunctionCallWithNoArguments()
    {
        var expr = new CallExpr("noArgs", []);
        Assert.Equal("$noArgs()", expr.Print());
    }

    [Fact]
    public void Prints_ValueExprWithObjectValue()
    {
        var obj = new ObjectValue(new Dictionary<string, ValueExpr>
        {
            ["name"] = new ValueExpr("John"),
            ["age"] = new ValueExpr(30)
        });
        var expr = new ValueExpr(obj);
        var printed = expr.Print();

        // Should print as object literal
        Assert.Contains("\"name\":", printed);
        Assert.Contains("\"John\"", printed);
        Assert.Contains("\"age\":", printed);
        Assert.Contains("30", printed);
        Assert.StartsWith("{", printed);
        Assert.EndsWith("}", printed);
    }

    [Fact]
    public void Prints_EmptyObjectValue()
    {
        var obj = new ObjectValue(new Dictionary<string, ValueExpr>());
        var expr = new ValueExpr(obj);
        Assert.Equal("{}", expr.Print());
    }
}
