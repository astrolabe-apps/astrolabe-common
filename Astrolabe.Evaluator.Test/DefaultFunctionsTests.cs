using System.Text.Json.Nodes;

namespace Astrolabe.Evaluator.Test;

/// <summary>
/// Comprehensive tests for all default functions in Astrolabe.Evaluator.
/// Tests the actual behavior and edge cases of each of the 39 default functions.
/// </summary>
public class DefaultFunctionsTests
{
    #region Mathematical Operations

    [Fact]
    public void Addition_WithIntegers()
    {
        var data = new JsonObject { ["a"] = 5, ["b"] = 3 };
        var result = TestHelpers.EvalExpr("a + b", data);
        Assert.Equal(8L, result);
    }

    [Fact]
    public void Addition_WithDoubles()
    {
        var data = new JsonObject { ["a"] = 5.5, ["b"] = 3.2 };
        var result = TestHelpers.EvalExpr("a + b", data);
        TestHelpers.AssertNumericEqual(8.7, result);
    }

    [Fact]
    public void Addition_MixedIntegerAndDouble()
    {
        var data = new JsonObject { ["a"] = 5, ["b"] = 3.5 };
        var result = TestHelpers.EvalExpr("a + b", data);
        TestHelpers.AssertNumericEqual(8.5, result);
    }

    [Fact]
    public void Addition_WithNull_ReturnsNull()
    {
        var data = new JsonObject { ["a"] = 5 };
        var result = TestHelpers.EvalExpr("a + b", data);
        Assert.Null(result);
    }

    [Fact]
    public void Subtraction_WithIntegers()
    {
        var data = new JsonObject { ["a"] = 10, ["b"] = 3 };
        var result = TestHelpers.EvalExpr("a - b", data);
        Assert.Equal(7L, result);
    }

    [Fact]
    public void Subtraction_WithDoubles()
    {
        var data = new JsonObject { ["a"] = 10.5, ["b"] = 3.2 };
        var result = TestHelpers.EvalExpr("a - b", data);
        TestHelpers.AssertNumericEqual(7.3, result);
    }

    [Fact]
    public void Multiplication_WithIntegers()
    {
        var data = new JsonObject { ["a"] = 5, ["b"] = 3 };
        var result = TestHelpers.EvalExpr("a * b", data);
        TestHelpers.AssertNumericEqual(15, result);
    }

    [Fact]
    public void Multiplication_WithDoubles()
    {
        var data = new JsonObject { ["a"] = 5.5, ["b"] = 2.0 };
        var result = TestHelpers.EvalExpr("a * b", data);
        TestHelpers.AssertNumericEqual(11.0, result);
    }

    [Fact]
    public void Division_WithIntegers_ReturnsDouble()
    {
        var data = new JsonObject { ["a"] = 10, ["b"] = 4 };
        var result = TestHelpers.EvalExpr("a / b", data);
        TestHelpers.AssertNumericEqual(2.5, result);
    }

    [Fact]
    public void Division_WithDoubles()
    {
        var data = new JsonObject { ["a"] = 10.0, ["b"] = 4.0 };
        var result = TestHelpers.EvalExpr("a / b", data);
        TestHelpers.AssertNumericEqual(2.5, result);
    }

    [Fact]
    public void Modulo_WithIntegers()
    {
        var data = new JsonObject { ["a"] = 10, ["b"] = 3 };
        var result = TestHelpers.EvalExpr("a % b", data);
        TestHelpers.AssertNumericEqual(1, result);
    }

    [Fact]
    public void Modulo_WithDoubles()
    {
        var data = new JsonObject { ["a"] = 10.5, ["b"] = 3.0 };
        var result = TestHelpers.EvalExpr("a % b", data);
        TestHelpers.AssertNumericEqual(1.5, result);
    }

    #endregion

    #region Mathematical Rounding Functions

    [Fact]
    public void Floor_WithPositiveDouble()
    {
        var data = new JsonObject { ["num"] = 3.7 };
        var result = TestHelpers.EvalExpr("$floor(num)", data);
        Assert.Equal(3.0, result);
    }

    [Fact]
    public void Floor_WithNegativeDouble()
    {
        var data = new JsonObject { ["num"] = -3.7 };
        var result = TestHelpers.EvalExpr("$floor(num)", data);
        Assert.Equal(-4.0, result);
    }

    [Fact]
    public void Floor_WithInteger()
    {
        var data = new JsonObject { ["num"] = 5 };
        var result = TestHelpers.EvalExpr("$floor(num)", data);
        Assert.Equal(5.0, result);
    }

    [Fact]
    public void Floor_WithZero()
    {
        var data = new JsonObject { ["num"] = 0.0 };
        var result = TestHelpers.EvalExpr("$floor(num)", data);
        Assert.Equal(0.0, result);
    }

    [Fact]
    public void Floor_WithMultipleArgs_ReturnsNull()
    {
        var data = new JsonObject { ["a"] = 5.7, ["b"] = 3.2 };
        var result = TestHelpers.EvalExpr("$floor(a, b)", data);
        Assert.Null(result);
    }

    [Fact]
    public void Floor_WithNull_ReturnsNull()
    {
        var data = new JsonObject();
        var result = TestHelpers.EvalExpr("$floor(missing)", data);
        Assert.Null(result);
    }

    [Fact]
    public void Ceil_WithPositiveDouble()
    {
        var data = new JsonObject { ["num"] = 3.2 };
        var result = TestHelpers.EvalExpr("$ceil(num)", data);
        Assert.Equal(4.0, result);
    }

    [Fact]
    public void Ceil_WithNegativeDouble()
    {
        var data = new JsonObject { ["num"] = -3.2 };
        var result = TestHelpers.EvalExpr("$ceil(num)", data);
        Assert.Equal(-3.0, result);
    }

    [Fact]
    public void Ceil_WithInteger()
    {
        var data = new JsonObject { ["num"] = 5 };
        var result = TestHelpers.EvalExpr("$ceil(num)", data);
        Assert.Equal(5.0, result);
    }

    [Fact]
    public void Ceil_WithZero()
    {
        var data = new JsonObject { ["num"] = 0.0 };
        var result = TestHelpers.EvalExpr("$ceil(num)", data);
        Assert.Equal(0.0, result);
    }

    [Fact]
    public void Ceil_WithMultipleArgs_ReturnsNull()
    {
        var data = new JsonObject { ["a"] = 5.3, ["b"] = 2.8 };
        var result = TestHelpers.EvalExpr("$ceil(a, b)", data);
        Assert.Null(result);
    }

    [Fact]
    public void Ceil_WithNull_ReturnsNull()
    {
        var data = new JsonObject();
        var result = TestHelpers.EvalExpr("$ceil(missing)", data);
        Assert.Null(result);
    }

    #endregion

    #region Comparison Operations

    [Fact]
    public void Equality_WithEqualNumbers()
    {
        var data = new JsonObject { ["a"] = 5, ["b"] = 5 };
        var result = TestHelpers.EvalExpr("a = b", data);
        Assert.True((bool)result!);
    }

    [Fact]
    public void Equality_WithDifferentNumbers()
    {
        var data = new JsonObject { ["a"] = 5, ["b"] = 3 };
        var result = TestHelpers.EvalExpr("a = b", data);
        Assert.False((bool)result!);
    }

    [Fact]
    public void Equality_WithEqualStrings()
    {
        var data = new JsonObject { ["a"] = "hello", ["b"] = "hello" };
        var result = TestHelpers.EvalExpr("a = b", data);
        Assert.True((bool)result!);
    }

    [Fact]
    public void Equality_WithBooleans()
    {
        var data = new JsonObject { ["a"] = true, ["b"] = true };
        var result = TestHelpers.EvalExpr("a = b", data);
        Assert.True((bool)result!);
    }

    [Fact]
    public void Equality_WithNull_ReturnsNull()
    {
        var data = new JsonObject { ["a"] = 5 };
        var result = TestHelpers.EvalExpr("a = b", data);
        Assert.Null(result);
    }

    [Fact]
    public void NotEqual_WithDifferentValues()
    {
        var data = new JsonObject { ["a"] = 5, ["b"] = 3 };
        var result = TestHelpers.EvalExpr("a != b", data);
        Assert.True((bool)result!);
    }

    [Fact]
    public void NotEqual_WithEqualValues()
    {
        var data = new JsonObject { ["a"] = 5, ["b"] = 5 };
        var result = TestHelpers.EvalExpr("a != b", data);
        Assert.False((bool)result!);
    }

    [Fact]
    public void LessThan_True()
    {
        var data = new JsonObject { ["a"] = 3, ["b"] = 5 };
        var result = TestHelpers.EvalExpr("a < b", data);
        Assert.True((bool)result!);
    }

    [Fact]
    public void LessThan_False()
    {
        var data = new JsonObject { ["a"] = 5, ["b"] = 3 };
        var result = TestHelpers.EvalExpr("a < b", data);
        Assert.False((bool)result!);
    }

    [Fact]
    public void LessThanOrEqual_WithEqual()
    {
        var data = new JsonObject { ["a"] = 5, ["b"] = 5 };
        var result = TestHelpers.EvalExpr("a <= b", data);
        Assert.True((bool)result!);
    }

    [Fact]
    public void LessThanOrEqual_WithLess()
    {
        var data = new JsonObject { ["a"] = 3, ["b"] = 5 };
        var result = TestHelpers.EvalExpr("a <= b", data);
        Assert.True((bool)result!);
    }

    [Fact]
    public void GreaterThan_True()
    {
        var data = new JsonObject { ["a"] = 10, ["b"] = 5 };
        var result = TestHelpers.EvalExpr("a > b", data);
        Assert.True((bool)result!);
    }

    [Fact]
    public void GreaterThan_False()
    {
        var data = new JsonObject { ["a"] = 3, ["b"] = 5 };
        var result = TestHelpers.EvalExpr("a > b", data);
        Assert.False((bool)result!);
    }

    [Fact]
    public void GreaterThanOrEqual_WithEqual()
    {
        var data = new JsonObject { ["a"] = 5, ["b"] = 5 };
        var result = TestHelpers.EvalExpr("a >= b", data);
        Assert.True((bool)result!);
    }

    [Fact]
    public void GreaterThanOrEqual_WithGreater()
    {
        var data = new JsonObject { ["a"] = 10, ["b"] = 5 };
        var result = TestHelpers.EvalExpr("a >= b", data);
        Assert.True((bool)result!);
    }

    [Fact]
    public void Comparison_WithStrings()
    {
        var data = new JsonObject { ["a"] = "apple", ["b"] = "banana" };
        var result = TestHelpers.EvalExpr("a < b", data);
        Assert.True((bool)result!);
    }

    #endregion

    #region Logical Operations

    [Fact]
    public void And_BothTrue()
    {
        var data = new JsonObject { ["a"] = true, ["b"] = true };
        var result = TestHelpers.EvalExpr("a and b", data);
        Assert.True((bool)result!);
    }

    [Fact]
    public void And_OneFalse()
    {
        var data = new JsonObject { ["a"] = true, ["b"] = false };
        var result = TestHelpers.EvalExpr("a and b", data);
        Assert.False((bool)result!);
    }

    [Fact]
    public void And_BothFalse()
    {
        var data = new JsonObject { ["a"] = false, ["b"] = false };
        var result = TestHelpers.EvalExpr("a and b", data);
        Assert.False((bool)result!);
    }

    [Fact]
    public void And_WithNull_ReturnsNull()
    {
        var data = new JsonObject { ["a"] = true };
        var result = TestHelpers.EvalExpr("a and b", data);
        Assert.Null(result);
    }

    [Fact]
    public void And_MultipleValues()
    {
        var data = new JsonObject
        {
            ["a"] = true,
            ["b"] = true,
            ["c"] = true,
        };
        var result = TestHelpers.EvalExpr("a and b and c", data);
        Assert.True((bool)result!);
    }

    [Fact]
    public void Or_BothTrue()
    {
        var data = new JsonObject { ["a"] = true, ["b"] = true };
        var result = TestHelpers.EvalExpr("a or b", data);
        Assert.True((bool)result!);
    }

    [Fact]
    public void Or_OneTrue()
    {
        var data = new JsonObject { ["a"] = false, ["b"] = true };
        var result = TestHelpers.EvalExpr("a or b", data);
        Assert.True((bool)result!);
    }

    [Fact]
    public void Or_BothFalse()
    {
        var data = new JsonObject { ["a"] = false, ["b"] = false };
        var result = TestHelpers.EvalExpr("a or b", data);
        Assert.False((bool)result!);
    }

    [Fact]
    public void Or_WithNull_ReturnsNull()
    {
        var data = new JsonObject { ["a"] = false };
        var result = TestHelpers.EvalExpr("a or b", data);
        Assert.Null(result);
    }

    [Fact]
    public void Not_WithTrue()
    {
        var data = new JsonObject { ["a"] = true };
        var result = TestHelpers.EvalExpr("!a", data);
        Assert.False((bool)result!);
    }

    [Fact]
    public void Not_WithFalse()
    {
        var data = new JsonObject { ["a"] = false };
        var result = TestHelpers.EvalExpr("!a", data);
        Assert.True((bool)result!);
    }

    [Fact]
    public void Not_WithNull_ReturnsNull()
    {
        var data = new JsonObject();
        var result = TestHelpers.EvalExpr("!a", data);
        Assert.Null(result);
    }

    [Fact]
    public void And_FunctionCallSyntax_BothTrue()
    {
        var data = new JsonObject { ["a"] = true, ["b"] = true };
        var result = TestHelpers.EvalExpr("$and(a, b)", data);
        Assert.True((bool)result!);
    }

    [Fact]
    public void And_FunctionCallSyntax_OneFalse()
    {
        var data = new JsonObject { ["a"] = true, ["b"] = false };
        var result = TestHelpers.EvalExpr("$and(a, b)", data);
        Assert.False((bool)result!);
    }

    [Fact]
    public void Or_FunctionCallSyntax_BothTrue()
    {
        var data = new JsonObject { ["a"] = true, ["b"] = true };
        var result = TestHelpers.EvalExpr("$or(a, b)", data);
        Assert.True((bool)result!);
    }

    [Fact]
    public void Or_FunctionCallSyntax_OneTrue()
    {
        var data = new JsonObject { ["a"] = false, ["b"] = true };
        var result = TestHelpers.EvalExpr("$or(a, b)", data);
        Assert.True((bool)result!);
    }

    [Fact]
    public void Or_FunctionCallSyntax_BothFalse()
    {
        var data = new JsonObject { ["a"] = false, ["b"] = false };
        var result = TestHelpers.EvalExpr("$or(a, b)", data);
        Assert.False((bool)result!);
    }

    #endregion

    #region Conditional and Null Handling

    [Fact]
    public void Conditional_TrueCondition()
    {
        var data = new JsonObject
        {
            ["cond"] = true,
            ["a"] = "yes",
            ["b"] = "no",
        };
        var result = TestHelpers.EvalExpr("cond ? a : b", data);
        Assert.Equal("yes", result);
    }

    [Fact]
    public void Conditional_FalseCondition()
    {
        var data = new JsonObject
        {
            ["cond"] = false,
            ["a"] = "yes",
            ["b"] = "no",
        };
        var result = TestHelpers.EvalExpr("cond ? a : b", data);
        Assert.Equal("no", result);
    }

    [Fact]
    public void Conditional_NullCondition_ReturnsNull()
    {
        var data = new JsonObject { ["a"] = "yes", ["b"] = "no" };
        var result = TestHelpers.EvalExpr("cond ? a : b", data);
        Assert.Null(result);
    }

    [Fact]
    public void Conditional_WithExpressions()
    {
        var data = new JsonObject { ["x"] = 10, ["y"] = 5 };
        var result = TestHelpers.EvalExpr("x > y ? x : y", data);
        Assert.Equal(10, result);
    }

    [Fact]
    public void NullCoalesce_FirstIsNotNull()
    {
        var data = new JsonObject { ["a"] = "value", ["b"] = "fallback" };
        var result = TestHelpers.EvalExpr("a ?? b", data);
        Assert.Equal("value", result);
    }

    [Fact]
    public void NullCoalesce_FirstIsNull()
    {
        var data = new JsonObject { ["b"] = "fallback" };
        var result = TestHelpers.EvalExpr("a ?? b", data);
        Assert.Equal("fallback", result);
    }

    [Fact]
    public void NullCoalesce_BothNull()
    {
        var data = new JsonObject();
        var result = TestHelpers.EvalExpr("a ?? b", data);
        Assert.Null(result);
    }

    [Fact]
    public void NullCoalesce_ChainedCoalesce()
    {
        var data = new JsonObject { ["c"] = "third" };
        var result = TestHelpers.EvalExpr("a ?? b ?? c", data);
        Assert.Equal("third", result);
    }

    #endregion

    #region Array Aggregate Functions

    [Fact]
    public void Sum_WithIntegers()
    {
        var data = new JsonObject { ["nums"] = new JsonArray(1, 2, 3, 4, 5) };
        var result = TestHelpers.EvalExpr("$sum(nums)", data);
        Assert.Equal(15.0, result);
    }

    [Fact]
    public void Sum_WithDoubles()
    {
        var data = new JsonObject { ["nums"] = new JsonArray(1.5, 2.5, 3.0) };
        var result = TestHelpers.EvalExpr("$sum(nums)", data);
        TestHelpers.AssertNumericEqual(7.0, result);
    }

    [Fact]
    public void Sum_EmptyArray()
    {
        var data = new JsonObject { ["nums"] = new JsonArray() };
        var result = TestHelpers.EvalExpr("$sum(nums)", data);
        Assert.Equal(0.0, result);
    }

    [Fact]
    public void Sum_WithDirectValues()
    {
        var result = TestHelpers.EvalExpr("$sum(1, 2, 3, 4)");
        Assert.Equal(10.0, result);
    }

    [Fact]
    public void Min_WithIntegers()
    {
        var data = new JsonObject { ["nums"] = new JsonArray(5, 2, 8, 1, 9) };
        var result = TestHelpers.EvalExpr("$min(nums)", data);
        Assert.Equal(1.0, result);
    }

    [Fact]
    public void Min_WithDoubles()
    {
        var data = new JsonObject { ["nums"] = new JsonArray(5.5, 2.3, 8.7, 1.2) };
        var result = TestHelpers.EvalExpr("$min(nums)", data);
        TestHelpers.AssertNumericEqual(1.2, result);
    }

    [Fact]
    public void Max_WithIntegers()
    {
        var data = new JsonObject { ["nums"] = new JsonArray(5, 2, 8, 1, 9) };
        var result = TestHelpers.EvalExpr("$max(nums)", data);
        Assert.Equal(9.0, result);
    }

    [Fact]
    public void Max_WithDoubles()
    {
        var data = new JsonObject { ["nums"] = new JsonArray(5.5, 2.3, 8.7, 1.2) };
        var result = TestHelpers.EvalExpr("$max(nums)", data);
        TestHelpers.AssertNumericEqual(8.7, result);
    }

    [Fact]
    public void Count_WithArray()
    {
        var data = new JsonObject { ["items"] = new JsonArray(1, 2, 3, 4, 5) };
        var result = TestHelpers.EvalExpr("$count(items)", data);
        Assert.Equal(5L, result);
    }

    [Fact]
    public void Count_EmptyArray()
    {
        var data = new JsonObject { ["items"] = new JsonArray() };
        var result = TestHelpers.EvalExpr("$count(items)", data);
        Assert.Equal(0L, result);
    }

    [Fact]
    public void Count_WithDirectValues()
    {
        var result = TestHelpers.EvalExpr("$count(1, 2, 3)");
        Assert.Equal(3L, result);
    }

    [Fact]
    public void Any_WithMatch()
    {
        var data = new JsonObject { ["nums"] = new JsonArray(1, 2, 3, 4, 5) };
        var result = TestHelpers.EvalExpr("$any(nums, $i => $this() > 3)", data);
        Assert.True((bool)result!);
    }

    [Fact]
    public void Any_WithNoMatch()
    {
        var data = new JsonObject { ["nums"] = new JsonArray(1, 2, 3) };
        var result = TestHelpers.EvalExpr("$any(nums, $i => $this() > 10)", data);
        Assert.False((bool)result!);
    }

    [Fact]
    public void Any_EmptyArray()
    {
        var data = new JsonObject { ["nums"] = new JsonArray() };
        var result = TestHelpers.EvalExpr("$any(nums, $i => $this() > 0)", data);
        Assert.False((bool)result!);
    }

    [Fact]
    public void All_AllMatch()
    {
        var data = new JsonObject { ["nums"] = new JsonArray(1, 2, 3, 4, 5) };
        var result = TestHelpers.EvalExpr("$all(nums, $i => $this() > 0)", data);
        Assert.True((bool)result!);
    }

    [Fact]
    public void All_SomeDoNotMatch()
    {
        var data = new JsonObject { ["nums"] = new JsonArray(1, 2, 3, 4, 5) };
        var result = TestHelpers.EvalExpr("$all(nums, $i => $this() > 3)", data);
        Assert.False((bool)result!);
    }

    [Fact]
    public void All_EmptyArray()
    {
        var data = new JsonObject { ["nums"] = new JsonArray() };
        var result = TestHelpers.EvalExpr("$all(nums, $i => $this() > 0)", data);
        Assert.True((bool)result!);
    }

    [Fact]
    public void Contains_WithMatch()
    {
        var data = new JsonObject { ["items"] = new JsonArray(1, 2, 3, 4, 5) };
        var result = TestHelpers.EvalExpr("$contains(items, $i => 3)", data);
        Assert.True((bool)result!);
    }

    [Fact]
    public void Contains_NoMatch()
    {
        var data = new JsonObject { ["items"] = new JsonArray(1, 2, 3, 4, 5) };
        var result = TestHelpers.EvalExpr("$contains(items, $i => 10)", data);
        Assert.False((bool)result!);
    }

    [Fact]
    public void Contains_WithStrings()
    {
        var data = new JsonObject { ["items"] = new JsonArray("apple", "banana", "cherry") };
        var result = TestHelpers.EvalExpr("$contains(items, $i => \"banana\")", data);
        Assert.True((bool)result!);
    }

    #endregion

    #region Array Access and Transform Functions

    [Fact]
    public void Array_CreateFromValues()
    {
        var result = TestHelpers.EvalExpr("$array(1, 2, 3)");
        var array = (ArrayValue)result!;
        var values = array.Values.Select(v => v.AsLong()).ToList();
        Assert.Equal(new[] { 1L, 2L, 3L }, values);
    }

    [Fact]
    public void Array_FlattenNestedArrays()
    {
        var data = new JsonObject
        {
            ["arr"] = new JsonArray(new JsonArray(1, 2), new JsonArray(3, 4)),
        };
        var result = TestHelpers.EvalExpr("$array(arr)", data);
        var array = (ArrayValue)result!;
        var values = array.Values.Select(v => v.AsLong()).ToList();
        Assert.Equal(new[] { 1L, 2L, 3L, 4L }, values);
    }

    [Fact]
    public void Elem_ValidIndex()
    {
        var data = new JsonObject { ["items"] = new JsonArray(10, 20, 30, 40) };
        var result = TestHelpers.EvalExpr("$elem(items, 2)", data);
        Assert.Equal(30, result);
    }

    [Fact]
    public void Elem_FirstIndex()
    {
        var data = new JsonObject { ["items"] = new JsonArray(10, 20, 30) };
        var result = TestHelpers.EvalExpr("$elem(items, 0)", data);
        Assert.Equal(10, result);
    }

    [Fact]
    public void Elem_LastIndex()
    {
        var data = new JsonObject { ["items"] = new JsonArray(10, 20, 30) };
        var result = TestHelpers.EvalExpr("$elem(items, 2)", data);
        Assert.Equal(30, result);
    }

    [Fact]
    public void Elem_OutOfBounds_ReturnsNull()
    {
        var data = new JsonObject { ["items"] = new JsonArray(10, 20, 30) };
        var result = TestHelpers.EvalExpr("$elem(items, 5)", data);
        Assert.Null(result);
    }

    [Fact]
    public void First_FindsMatch()
    {
        var data = new JsonObject { ["nums"] = new JsonArray(1, 5, 3, 8, 2) };
        var result = TestHelpers.EvalExpr("$first(nums, $i => $this() > 4)", data);
        Assert.Equal(5, result);
    }

    [Fact]
    public void First_NoMatch_ReturnsNull()
    {
        var data = new JsonObject { ["nums"] = new JsonArray(1, 2, 3) };
        var result = TestHelpers.EvalExpr("$first(nums, $i => $this() > 10)", data);
        Assert.Null(result);
    }

    [Fact]
    public void FirstIndex_FindsMatch()
    {
        var data = new JsonObject { ["nums"] = new JsonArray(1, 5, 3, 8, 2) };
        var result = TestHelpers.EvalExpr("$firstIndex(nums, $i => $this() > 4)", data);
        Assert.Equal(1, result);
    }

    [Fact]
    public void FirstIndex_NoMatch_ReturnsNull()
    {
        var data = new JsonObject { ["nums"] = new JsonArray(1, 2, 3) };
        var result = TestHelpers.EvalExpr("$firstIndex(nums, $i => $this() > 10)", data);
        Assert.Null(result);
    }

    [Fact]
    public void IndexOf_FindsValue()
    {
        var data = new JsonObject { ["items"] = new JsonArray(10, 20, 30, 40) };
        var result = TestHelpers.EvalExpr("$indexOf(items, $i => 30)", data);
        Assert.Equal(2, result);
    }

    [Fact]
    public void IndexOf_ValueNotFound_ReturnsNull()
    {
        var data = new JsonObject { ["items"] = new JsonArray(10, 20, 30) };
        var result = TestHelpers.EvalExpr("$indexOf(items, $i => 99)", data);
        Assert.Null(result);
    }

    [Fact]
    public void Filter_WithPredicate()
    {
        var data = new JsonObject { ["nums"] = new JsonArray(1, 2, 3, 4, 5, 6) };
        var result = TestHelpers.EvalExpr("nums[$i => $this() > 3]", data);
        var array = (ArrayValue)result!;
        var values = array.Values.Select(v => v.AsLong()).ToList();
        Assert.Equal(new[] { 4L, 5L, 6L }, values);
    }

    [Fact]
    public void Filter_NoMatches_ReturnsEmptyArray()
    {
        var data = new JsonObject { ["nums"] = new JsonArray(1, 2, 3) };
        var result = TestHelpers.EvalExpr("nums[$i => $this() > 10]", data);
        var array = (ArrayValue)result!;
        Assert.Empty(array.Values);
    }

    [Fact]
    public void Filter_WithIndexAccess()
    {
        var data = new JsonObject { ["nums"] = new JsonArray(10, 20, 30, 40, 50) };
        var result = TestHelpers.EvalExpr("nums[$i => $i >= 2]", data);
        var array = (ArrayValue)result!;
        var values = array.Values.Select(v => v.AsLong()).ToList();
        Assert.Equal(new[] { 30L, 40L, 50L }, values);
    }

    #endregion

    #region Array Mapping Functions

    [Fact]
    public void Map_TransformValues()
    {
        var data = new JsonObject { ["nums"] = new JsonArray(1, 2, 3, 4) };
        var result = TestHelpers.EvalExpr("$map(nums, $x => $x * 2)", data);
        var array = (ArrayValue)result!;
        var values = array.Values.Select(v => v.AsLong()).ToList();
        Assert.Equal(new[] { 2L, 4L, 6L, 8L }, values);
    }

    [Fact]
    public void Map_EmptyArray()
    {
        var data = new JsonObject { ["nums"] = new JsonArray() };
        var result = TestHelpers.EvalExpr("$map(nums, $x => $x * 2)", data);
        var array = (ArrayValue)result!;
        Assert.Empty(array.Values);
    }

    [Fact]
    public void Map_WithObjects()
    {
        var data = new JsonObject
        {
            ["items"] = new JsonArray(
                new JsonObject { ["value"] = 10 },
                new JsonObject { ["value"] = 20 },
                new JsonObject { ["value"] = 30 }
            ),
        };
        var result = TestHelpers.EvalExpr("$map(items, $x => $x[\"value\"])", data);
        var array = (ArrayValue)result!;
        var values = array.Values.Select(v => v.AsLong()).ToList();
        Assert.Equal(new[] { 10L, 20L, 30L }, values);
    }

    [Fact]
    public void FlatMap_FlattenArrays()
    {
        var data = new JsonObject
        {
            ["items"] = new JsonArray(
                new JsonObject { ["values"] = new JsonArray(1, 2) },
                new JsonObject { ["values"] = new JsonArray(3, 4) }
            ),
        };
        var result = TestHelpers.EvalExpr("items . values", data);
        var array = (ArrayValue)result!;
        var values = array.Values.Select(v => v.AsLong()).ToList();
        Assert.Equal(new[] { 1L, 2L, 3L, 4L }, values);
    }

    [Fact]
    public void FlatMap_WithEmptyResults()
    {
        var data = new JsonObject
        {
            ["items"] = new JsonArray(
                new JsonObject { ["values"] = new JsonArray(1, 2) },
                new JsonObject { ["values"] = new JsonArray() },
                new JsonObject { ["values"] = new JsonArray(3) }
            ),
        };
        var result = TestHelpers.EvalExpr("items . values", data);
        var array = (ArrayValue)result!;
        var values = array.Values.Select(v => v.AsLong()).ToList();
        Assert.Equal(new[] { 1L, 2L, 3L }, values);
    }

    #endregion

    #region String Functions

    [Fact]
    public void String_ConcatenateValues()
    {
        var data = new JsonObject { ["first"] = "Hello", ["last"] = "World" };
        var result = TestHelpers.EvalExpr("$string(first, \" \", last)", data);
        Assert.Equal("Hello World", result);
    }

    [Fact]
    public void String_ConvertNumber()
    {
        var data = new JsonObject { ["num"] = 42 };
        var result = TestHelpers.EvalExpr("$string(num)", data);
        Assert.Equal("42", result);
    }

    [Fact]
    public void String_ConvertBoolean()
    {
        var data = new JsonObject { ["flag"] = true };
        var result = TestHelpers.EvalExpr("$string(flag)", data);
        Assert.Equal("true", result);
    }

    [Fact]
    public void String_ConvertNull()
    {
        var data = new JsonObject();
        var result = TestHelpers.EvalExpr("$string(missing)", data);
        Assert.Equal("null", result);
    }

    [Fact]
    public void String_ConvertArray()
    {
        var data = new JsonObject { ["items"] = new JsonArray(1, 2, 3) };
        var result = TestHelpers.EvalExpr("$string(items)", data);
        Assert.Equal("123", result);
    }

    [Fact]
    public void Lower_ConvertToLowerCase()
    {
        var data = new JsonObject { ["text"] = "HELLO World" };
        var result = TestHelpers.EvalExpr("$lower(text)", data);
        Assert.Equal("hello world", result);
    }

    [Fact]
    public void Lower_AlreadyLowerCase()
    {
        var data = new JsonObject { ["text"] = "hello" };
        var result = TestHelpers.EvalExpr("$lower(text)", data);
        Assert.Equal("hello", result);
    }

    [Fact]
    public void Upper_ConvertToUpperCase()
    {
        var data = new JsonObject { ["text"] = "hello World" };
        var result = TestHelpers.EvalExpr("$upper(text)", data);
        Assert.Equal("HELLO WORLD", result);
    }

    [Fact]
    public void Upper_AlreadyUpperCase()
    {
        var data = new JsonObject { ["text"] = "HELLO" };
        var result = TestHelpers.EvalExpr("$upper(text)", data);
        Assert.Equal("HELLO", result);
    }

    [Fact]
    public void Fixed_FormatWithTwoDecimals()
    {
        var data = new JsonObject { ["num"] = 3.14159 };
        var result = TestHelpers.EvalExpr("$fixed(num, 2)", data);
        Assert.Equal("3.14", result);
    }

    [Fact]
    public void Fixed_FormatWithZeroDecimals()
    {
        var data = new JsonObject { ["num"] = 3.14159 };
        var result = TestHelpers.EvalExpr("$fixed(num, 0)", data);
        Assert.Equal("3", result);
    }

    [Fact]
    public void Fixed_FormatInteger()
    {
        var data = new JsonObject { ["num"] = 42 };
        var result = TestHelpers.EvalExpr("$fixed(num, 2)", data);
        Assert.Equal("42.00", result);
    }

    #endregion

    #region Object Functions

    [Fact]
    public void Object_CreateFromPairs()
    {
        var result = TestHelpers.EvalExpr("$object(\"name\", \"John\", \"age\", 30)");
        var obj = (ObjectValue)result!;
        Assert.Equal("John", obj.Properties["name"].Value);
        TestHelpers.AssertNumericEqual(30, obj.Properties["age"].Value);
    }

    [Fact]
    public void Object_EmptyObject()
    {
        var result = TestHelpers.EvalExpr("$object()");
        var obj = (ObjectValue)result!;
        Assert.Empty(obj.Properties);
    }

    [Fact]
    public void Object_WithVariousTypes()
    {
        var result = TestHelpers.EvalExpr("$object(\"str\", \"hello\", \"num\", 42, \"bool\", true)");
        var obj = (ObjectValue)result!;
        Assert.Equal("hello", obj.Properties["str"].Value);
        TestHelpers.AssertNumericEqual(42, obj.Properties["num"].Value);
        Assert.True((bool)obj.Properties["bool"].Value!);
    }

    [Fact]
    public void Keys_GetObjectKeys()
    {
        var data = new JsonObject
        {
            ["obj"] = new JsonObject
            {
                ["name"] = "John",
                ["age"] = 30,
                ["city"] = "NYC",
            },
        };
        var result = TestHelpers.EvalExpr("$keys(obj)", data);
        var array = (ArrayValue)result!;
        var keys = array.Values.Select(v => v.Value!.ToString()).OrderBy(x => x).ToList();
        Assert.Equal(new[] { "age", "city", "name" }, keys);
    }

    [Fact]
    public void Keys_EmptyObject()
    {
        var data = new JsonObject { ["obj"] = new JsonObject() };
        var result = TestHelpers.EvalExpr("$keys(obj)", data);
        var array = (ArrayValue)result!;
        Assert.Empty(array.Values);
    }

    [Fact]
    public void Values_GetObjectValues()
    {
        var data = new JsonObject
        {
            ["obj"] = new JsonObject
            {
                ["a"] = 10,
                ["b"] = 20,
                ["c"] = 30,
            },
        };
        var result = TestHelpers.EvalExpr("$values(obj)", data);
        var array = (ArrayValue)result!;
        var values = array.Values.Select(v => v.AsLong()).OrderBy(x => x).ToList();
        Assert.Equal(new[] { 10L, 20L, 30L }, values);
    }

    [Fact]
    public void Values_EmptyObject()
    {
        var data = new JsonObject { ["obj"] = new JsonObject() };
        var result = TestHelpers.EvalExpr("$values(obj)", data);
        var array = (ArrayValue)result!;
        Assert.Empty(array.Values);
    }

    #endregion

    #region Control Flow and Utility Functions

    [Fact]
    public void Which_MatchesFirstCase()
    {
        var data = new JsonObject
        {
            ["status"] = "pending",
            ["msg1"] = "Waiting",
            ["msg2"] = "Done",
        };
        var result = TestHelpers.EvalExpr("$which(status, \"pending\", msg1, \"complete\", msg2)", data);
        Assert.Equal("Waiting", result);
    }

    [Fact]
    public void Which_MatchesSecondCase()
    {
        var data = new JsonObject
        {
            ["status"] = "complete",
            ["msg1"] = "Waiting",
            ["msg2"] = "Done",
        };
        var result = TestHelpers.EvalExpr("$which(status, \"pending\", msg1, \"complete\", msg2)", data);
        Assert.Equal("Done", result);
    }

    [Fact]
    public void Which_NoMatch_ReturnsNull()
    {
        var data = new JsonObject
        {
            ["status"] = "unknown",
            ["msg1"] = "Waiting",
            ["msg2"] = "Done",
        };
        var result = TestHelpers.EvalExpr("$which(status, \"pending\", msg1, \"complete\", msg2)", data);
        Assert.Null(result);
    }

    [Fact]
    public void Which_WithArrayOfMatches()
    {
        var data = new JsonObject { ["status"] = "active", ["msg"] = "Running" };
        var result = TestHelpers.EvalExpr("$which(status, [\"active\", \"running\"], msg)", data);
        Assert.Equal("Running", result);
    }

    [Fact]
    public void This_InMapContext()
    {
        var data = new JsonObject { ["nums"] = new JsonArray(1, 2, 3) };
        var result = TestHelpers.EvalExpr("$map(nums, $x => $this())", data);
        var array = (ArrayValue)result!;
        var values = array.Values.Select(v => v.AsLong()).ToList();
        Assert.Equal(new[] { 1L, 2L, 3L }, values);
    }

    [Fact]
    public void This_InFilterContext()
    {
        var data = new JsonObject { ["nums"] = new JsonArray(1, 2, 3, 4, 5) };
        var result = TestHelpers.EvalExpr("nums[$i => $this() > 2]", data);
        var array = (ArrayValue)result!;
        var values = array.Values.Select(v => v.AsLong()).ToList();
        Assert.Equal(new[] { 3L, 4L, 5L }, values);
    }

    [Fact]
    public void NotEmpty_WithNonEmptyString()
    {
        var data = new JsonObject { ["text"] = "hello" };
        var result = TestHelpers.EvalExpr("$notEmpty(text)", data);
        Assert.True((bool)result!);
    }

    [Fact]
    public void NotEmpty_WithEmptyString()
    {
        var data = new JsonObject { ["text"] = "" };
        var result = TestHelpers.EvalExpr("$notEmpty(text)", data);
        Assert.False((bool)result!);
    }

    [Fact]
    public void NotEmpty_WithWhitespace()
    {
        var data = new JsonObject { ["text"] = "   " };
        var result = TestHelpers.EvalExpr("$notEmpty(text)", data);
        Assert.False((bool)result!);
    }

    [Fact]
    public void NotEmpty_WithNull()
    {
        var data = new JsonObject();
        var result = TestHelpers.EvalExpr("$notEmpty(missing)", data);
        Assert.False((bool)result!);
    }

    [Fact]
    public void NotEmpty_WithNumber()
    {
        var data = new JsonObject { ["num"] = 0 };
        var result = TestHelpers.EvalExpr("$notEmpty(num)", data);
        Assert.True((bool)result!);
    }

    [Fact]
    public void NotEmpty_WithBoolean()
    {
        var data = new JsonObject { ["flag"] = false };
        var result = TestHelpers.EvalExpr("$notEmpty(flag)", data);
        Assert.True((bool)result!);
    }

    #endregion

    #region Let Expression Variable References

    [Fact]
    public void LetExpression_VariableCanReferencePreviousVariable()
    {
        var result = TestHelpers.EvalExpr("let $x := 5, $y := $x + 10 in $y");
        TestHelpers.AssertNumericEqual(15, result);
    }

    [Fact]
    public void LetExpression_MultipleChainedVariableReferences()
    {
        var result = TestHelpers.EvalExpr("let $a := 2, $b := $a * 3, $c := $b + 1 in $c");
        TestHelpers.AssertNumericEqual(7, result); // 2 * 3 + 1 = 7
    }

    [Fact]
    public void LetExpression_VariableReferencesWithDataAccess()
    {
        var data = new JsonObject { ["value"] = 10 };
        var result = TestHelpers.EvalExpr("let $x := value, $y := $x * 2 in $y", data);
        TestHelpers.AssertNumericEqual(20, result);
    }

    [Fact]
    public void LetExpression_ComplexExpressionWithVariableReferences()
    {
        var data = new JsonObject
        {
            ["a"] = 10,
            ["b"] = 20,
            ["multiplier"] = 3,
        };
        var result = TestHelpers.EvalExpr(
            "let $sum := a + b, $avg := $sum / 2, $result := $avg * multiplier in $result",
            data
        );
        TestHelpers.AssertNumericEqual(45, result); // ((10 + 20) / 2) * 3 = 45
    }

    [Fact]
    public void LetExpression_VariableReferenceInArrayContext()
    {
        var result = TestHelpers.EvalExpr(
            "let $base := 5, $arr := $array($base, $base * 2, $base * 3) in $arr"
        );
        var array = Assert.IsType<ArrayValue>(result);
        var values = array.Values.Select(v => v.AsLong()).ToList();
        Assert.Equal(new[] { 5L, 10L, 15L }, values);
    }

    #endregion

    #region Merge Function

    [Fact]
    public void Merge_SingleObject_ReturnsObject()
    {
        var data = new JsonObject
        {
            ["obj"] = new JsonObject { ["a"] = 1, ["b"] = "test" },
        };
        var result = TestHelpers.EvalExpr("$merge(obj)", data);
        var merged = (ObjectValue)result!;
        Assert.Equal(2, merged.Properties.Count);
        Assert.Equal(1, merged.Properties["a"].Value);
        Assert.Equal("test", merged.Properties["b"].Value);
    }

    [Fact]
    public void Merge_MultipleObjects_MergesAll()
    {
        var data = new JsonObject
        {
            ["obj1"] = new JsonObject { ["a"] = 1 },
            ["obj2"] = new JsonObject { ["b"] = 2 },
        };
        var result = TestHelpers.EvalExpr("$merge(obj1, obj2)", data);
        var merged = (ObjectValue)result!;
        Assert.Equal(2, merged.Properties.Count);
        Assert.Equal(1, merged.Properties["a"].Value);
        Assert.Equal(2, merged.Properties["b"].Value);
    }

    [Fact]
    public void Merge_OverlappingKeys_LaterValueWins()
    {
        var data = new JsonObject
        {
            ["obj1"] = new JsonObject { ["a"] = 1 },
            ["obj2"] = new JsonObject { ["a"] = 2 },
        };
        var result = TestHelpers.EvalExpr("$merge(obj1, obj2)", data);
        var merged = (ObjectValue)result!;
        Assert.Equal(2, merged.Properties["a"].Value);
    }

    [Fact]
    public void Merge_NullArgument_ReturnsNull()
    {
        var data = new JsonObject { ["obj"] = new JsonObject { ["a"] = 1 } };
        var result = TestHelpers.EvalExpr("$merge(obj, null)", data);
        Assert.Null(result);
    }

    [Fact]
    public void Merge_NullAsFirstArgument_ReturnsNull()
    {
        var data = new JsonObject { ["obj"] = new JsonObject { ["a"] = 1 } };
        var result = TestHelpers.EvalExpr("$merge(null, obj)", data);
        Assert.Null(result);
    }

    [Fact]
    public void Merge_NoArguments_ReturnsError()
    {
        var env = TestHelpers.CreateBasicEnv(null);
        var parsed = TestHelpers.Parse("$merge()");
        var (result, errors) = env.EvalWithErrors(parsed);
        Assert.Null(result.Value);
        Assert.NotEmpty(errors);
    }

    [Fact]
    public void Merge_SkipsNonObjectArguments()
    {
        var data = new JsonObject { ["obj"] = new JsonObject { ["a"] = 1 } };
        var result = TestHelpers.EvalExpr("$merge(obj, \"not an object\", 42)", data);
        var merged = (ObjectValue)result!;
        Assert.Single(merged.Properties);
        Assert.Equal(1, merged.Properties["a"].Value);
    }

    [Fact]
    public void Merge_ThreeObjects()
    {
        var data = new JsonObject
        {
            ["obj1"] = new JsonObject { ["a"] = 1 },
            ["obj2"] = new JsonObject { ["b"] = 2 },
            ["obj3"] = new JsonObject { ["c"] = 3 },
        };
        var result = TestHelpers.EvalExpr("$merge(obj1, obj2, obj3)", data);
        var merged = (ObjectValue)result!;
        Assert.Equal(3, merged.Properties.Count);
        Assert.Equal(1, merged.Properties["a"].Value);
        Assert.Equal(2, merged.Properties["b"].Value);
        Assert.Equal(3, merged.Properties["c"].Value);
    }

    [Fact]
    public void Merge_WithComplexValues()
    {
        var data = new JsonObject
        {
            ["obj1"] = new JsonObject { ["arr"] = new JsonArray(1, 2, 3) },
            ["obj2"] = new JsonObject { ["nested"] = new JsonObject { ["x"] = 10 } },
        };
        var result = TestHelpers.EvalExpr("$merge(obj1, obj2)", data);
        var merged = (ObjectValue)result!;
        Assert.Equal(2, merged.Properties.Count);
    }

    #endregion
}
