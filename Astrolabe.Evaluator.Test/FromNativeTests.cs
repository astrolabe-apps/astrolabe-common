namespace Astrolabe.Evaluator.Test;

/// <summary>
/// Tests for ValueExpr.FromNative() which converts C# objects to ValueExpr.
/// </summary>
public class FromNativeTests
{
    #region Null Handling

    [Fact]
    public void FromNative_Null_ReturnsNull()
    {
        var result = ValueExpr.FromNative(null);
        Assert.Same(ValueExpr.Null, result);
        Assert.Null(result.Value);
    }

    #endregion

    #region Numeric Types

    [Fact]
    public void FromNative_Int_ReturnsValueExpr()
    {
        var result = ValueExpr.FromNative(42);
        Assert.Equal(42, result.Value);
    }

    [Fact]
    public void FromNative_Long_ReturnsValueExpr()
    {
        var result = ValueExpr.FromNative(42L);
        Assert.Equal(42L, result.Value);
    }

    [Fact]
    public void FromNative_Double_ReturnsValueExpr()
    {
        var result = ValueExpr.FromNative(3.14);
        Assert.Equal(3.14, result.Value);
    }

    [Fact]
    public void FromNative_Short_ConvertsToInt()
    {
        short s = 10;
        var result = ValueExpr.FromNative(s);
        Assert.Equal(10, result.Value);
        Assert.IsType<int>(result.Value);
    }

    [Fact]
    public void FromNative_Decimal_ConvertsToDouble()
    {
        decimal d = 123.45m;
        var result = ValueExpr.FromNative(d);
        Assert.Equal(123.45, result.Value);
        Assert.IsType<double>(result.Value);
    }

    [Fact]
    public void FromNative_Float_ReturnsValueExpr()
    {
        float f = 1.5f;
        var result = ValueExpr.FromNative(f);
        Assert.Equal(1.5f, result.Value);
    }

    #endregion

    #region String and Boolean

    [Fact]
    public void FromNative_String_ReturnsValueExpr()
    {
        var result = ValueExpr.FromNative("hello");
        Assert.Equal("hello", result.Value);
    }

    [Fact]
    public void FromNative_EmptyString_ReturnsValueExpr()
    {
        var result = ValueExpr.FromNative("");
        Assert.Equal("", result.Value);
    }

    [Fact]
    public void FromNative_True_ReturnsValueExpr()
    {
        var result = ValueExpr.FromNative(true);
        Assert.Equal(true, result.Value);
    }

    [Fact]
    public void FromNative_False_ReturnsValueExpr()
    {
        var result = ValueExpr.FromNative(false);
        Assert.Equal(false, result.Value);
    }

    #endregion

    #region ValueExpr Passthrough

    [Fact]
    public void FromNative_ValueExpr_ReturnsAsIs()
    {
        var original = new ValueExpr(42);
        var result = ValueExpr.FromNative(original);
        Assert.Same(original, result);
    }

    #endregion

    #region Dictionary Types

    [Fact]
    public void FromNative_Dictionary_ReturnsObjectValue()
    {
        var dict = new Dictionary<string, object?>
        {
            ["name"] = "John",
            ["age"] = 30,
        };
        var result = ValueExpr.FromNative(dict);

        var obj = Assert.IsType<ObjectValue>(result.Value);
        Assert.Equal(2, obj.Properties.Count);
        Assert.Equal("John", obj.Properties["name"].Value);
        Assert.Equal(30, obj.Properties["age"].Value);
    }

    [Fact]
    public void FromNative_Dictionary_WithNestedDictionary_ReturnsNestedObjectValue()
    {
        var dict = new Dictionary<string, object?>
        {
            ["person"] = new Dictionary<string, object?> { ["name"] = "Jane", ["age"] = 25 },
        };
        var result = ValueExpr.FromNative(dict);

        var obj = Assert.IsType<ObjectValue>(result.Value);
        var nested = Assert.IsType<ObjectValue>(obj.Properties["person"].Value);
        Assert.Equal("Jane", nested.Properties["name"].Value);
        Assert.Equal(25, nested.Properties["age"].Value);
    }

    [Fact]
    public void FromNative_Dictionary_WithNullValue_ReturnsObjectWithNull()
    {
        var dict = new Dictionary<string, object?> { ["key"] = null };
        var result = ValueExpr.FromNative(dict);

        var obj = Assert.IsType<ObjectValue>(result.Value);
        Assert.Null(obj.Properties["key"].Value);
    }

    #endregion

    #region IEnumerable Types (Currently Not Working)

    [Fact]
    public void FromNative_IntList_ReturnsArrayValue()
    {
        var list = new List<int> { 1, 2, 3 };
        var result = ValueExpr.FromNative(list);

        var array = Assert.IsType<ArrayValue>(result.Value);
        var values = array.Values.Select(v => v.Value).ToList();
        Assert.Equal(new object[] { 1, 2, 3 }, values);
    }

    [Fact]
    public void FromNative_StringArray_ReturnsArrayValue()
    {
        var arr = new[] { "a", "b", "c" };
        var result = ValueExpr.FromNative(arr);

        var array = Assert.IsType<ArrayValue>(result.Value);
        var values = array.Values.Select(v => v.Value).ToList();
        Assert.Equal(new[] { "a", "b", "c" }, values);
    }

    [Fact]
    public void FromNative_ObjectList_ReturnsArrayValue()
    {
        var list = new List<object?> { 1, "two", 3.0, null };
        var result = ValueExpr.FromNative(list);

        var array = Assert.IsType<ArrayValue>(result.Value);
        var values = array.Values.Select(v => v.Value).ToList();
        Assert.Equal(4, values.Count);
        Assert.Equal(1, values[0]);
        Assert.Equal("two", values[1]);
        Assert.Equal(3.0, values[2]);
        Assert.Null(values[3]);
    }

    [Fact]
    public void FromNative_EmptyList_ReturnsEmptyArrayValue()
    {
        var list = new List<int>();
        var result = ValueExpr.FromNative(list);

        var array = Assert.IsType<ArrayValue>(result.Value);
        Assert.Empty(array.Values);
    }

    [Fact]
    public void FromNative_IEnumerable_ReturnsArrayValue()
    {
        IEnumerable<int> enumerable = Enumerable.Range(1, 3);
        var result = ValueExpr.FromNative(enumerable);

        var array = Assert.IsType<ArrayValue>(result.Value);
        var values = array.Values.Select(v => v.Value).ToList();
        Assert.Equal(new object[] { 1, 2, 3 }, values);
    }

    [Fact]
    public void FromNative_NestedList_ReturnsNestedArrayValue()
    {
        var list = new List<object?>
        {
            new List<int> { 1, 2 },
            new List<int> { 3, 4 },
        };
        var result = ValueExpr.FromNative(list);

        var array = Assert.IsType<ArrayValue>(result.Value);
        Assert.Equal(2, array.Values.Count());

        var first = Assert.IsType<ArrayValue>(array.Values.First().Value);
        Assert.Equal(new object[] { 1, 2 }, first.Values.Select(v => v.Value).ToArray());
    }

    [Fact]
    public void FromNative_ListOfDictionary_ReturnsArrayOfObjects()
    {
        var list = new List<Dictionary<string, object?>>
        {
            new() { ["name"] = "Alice" },
            new() { ["name"] = "Bob" },
        };
        var result = ValueExpr.FromNative(list);

        var array = Assert.IsType<ArrayValue>(result.Value);
        Assert.Equal(2, array.Values.Count());

        var first = Assert.IsType<ObjectValue>(array.Values.First().Value);
        Assert.Equal("Alice", first.Properties["name"].Value);
    }

    #endregion

    #region Mixed Types in Dictionary with Arrays

    [Fact]
    public void FromNative_Dictionary_WithListValue_ReturnsObjectWithArray()
    {
        var dict = new Dictionary<string, object?>
        {
            ["name"] = "John",
            ["scores"] = new List<int> { 90, 85, 95 },
        };
        var result = ValueExpr.FromNative(dict);

        var obj = Assert.IsType<ObjectValue>(result.Value);
        Assert.Equal("John", obj.Properties["name"].Value);

        var scores = Assert.IsType<ArrayValue>(obj.Properties["scores"].Value);
        var scoreValues = scores.Values.Select(v => v.Value).ToList();
        Assert.Equal(new object[] { 90, 85, 95 }, scoreValues);
    }

    #endregion

    #region String Split and Select (Real-world scenario)

    [Fact]
    public void FromNative_StringSplitSelect_ReturnsArrayValue()
    {
        // Simulates: dbRoad.Curfews?.Split(",").Select(x => x.Trim())
        var curfews = "Morning, Afternoon, Evening";
        var splitAndTrimmed = curfews.Split(",").Select(x => x.Trim());

        var result = ValueExpr.FromNative(splitAndTrimmed);

        var array = Assert.IsType<ArrayValue>(result.Value);
        var values = array.Values.Select(v => v.Value).ToList();
        Assert.Equal(new[] { "Morning", "Afternoon", "Evening" }, values);
    }

    [Fact]
    public void FromNative_StringSplitSelectToArray_ReturnsArrayValue()
    {
        // Similar but with ToArray()
        var curfews = "A, B, C";
        var splitAndTrimmed = curfews.Split(",").Select(x => x.Trim()).ToArray();

        var result = ValueExpr.FromNative(splitAndTrimmed);

        var array = Assert.IsType<ArrayValue>(result.Value);
        var values = array.Values.Select(v => v.Value).ToList();
        Assert.Equal(new[] { "A", "B", "C" }, values);
    }

    [Fact]
    public void FromNative_StringSplitSelectToList_ReturnsArrayValue()
    {
        // Similar but with ToList()
        var curfews = "X, Y, Z";
        var splitAndTrimmed = curfews.Split(",").Select(x => x.Trim()).ToList();

        var result = ValueExpr.FromNative(splitAndTrimmed);

        var array = Assert.IsType<ArrayValue>(result.Value);
        var values = array.Values.Select(v => v.Value).ToList();
        Assert.Equal(new[] { "X", "Y", "Z" }, values);
    }

    [Fact]
    public void FromNative_LinqWhereSelect_ReturnsArrayValue()
    {
        var numbers = new[] { 1, 2, 3, 4, 5 };
        var filtered = numbers.Where(x => x > 2).Select(x => x * 10);

        var result = ValueExpr.FromNative(filtered);

        var array = Assert.IsType<ArrayValue>(result.Value);
        var values = array.Values.Select(v => v.Value).ToList();
        Assert.Equal(new object[] { 30, 40, 50 }, values);
    }

    #endregion

    #region Edge Cases

    [Fact]
    public void FromNative_DateTime_ReturnsValueExpr()
    {
        var dt = new DateTime(2024, 1, 15);
        var result = ValueExpr.FromNative(dt);
        Assert.Equal(dt, result.Value);
    }

    [Fact]
    public void FromNative_Guid_ReturnsValueExpr()
    {
        var guid = Guid.NewGuid();
        var result = ValueExpr.FromNative(guid);
        Assert.Equal(guid, result.Value);
    }

    [Fact]
    public void FromNative_Enum_ReturnsValueExpr()
    {
        var result = ValueExpr.FromNative(DayOfWeek.Monday);
        Assert.Equal(DayOfWeek.Monday, result.Value);
    }

    #endregion
}