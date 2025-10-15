using System.Text.Json;
using Xunit;

namespace Astrolabe.Schemas.Tests;

/// <summary>
/// Tests for dynamic property coercion helper methods
/// </summary>
public class DynamicPropertyHelpersTests
{
    [Fact]
    public void CoerceString_WithNull_ReturnsEmptyString()
    {
        var result = DynamicPropertyHelpers.CoerceString(null);
        Assert.Equal("", result);
    }

    [Fact]
    public void CoerceString_WithString_ReturnsString()
    {
        var result = DynamicPropertyHelpers.CoerceString("test");
        Assert.Equal("test", result);
    }

    [Fact]
    public void CoerceString_WithInt_ReturnsStringRepresentation()
    {
        var result = DynamicPropertyHelpers.CoerceString(123);
        Assert.Equal("123", result);
    }

    [Fact]
    public void CoerceString_WithBool_ReturnsStringRepresentation()
    {
        var result = DynamicPropertyHelpers.CoerceString(true);
        Assert.Equal("True", result);
    }

    [Fact]
    public void CoerceString_WithObject_ReturnsJsonSerialization()
    {
        var obj = new { name = "test", value = 42 };
        var result = DynamicPropertyHelpers.CoerceString(obj);
        Assert.Contains("name", result);
        Assert.Contains("test", result);
        Assert.Contains("42", result);
    }

    [Fact]
    public void CoerceBool_WithTrue_ReturnsTrue()
    {
        var result = DynamicPropertyHelpers.CoerceBool(true);
        Assert.True(result);
    }

    [Fact]
    public void CoerceBool_WithFalse_ReturnsFalse()
    {
        var result = DynamicPropertyHelpers.CoerceBool(false);
        Assert.False(result);
    }

    [Fact]
    public void CoerceBool_WithNull_ReturnsFalse()
    {
        var result = DynamicPropertyHelpers.CoerceBool(null);
        Assert.False(result);
    }

    [Fact]
    public void CoerceBool_WithNonNull_ReturnsTrue()
    {
        var result = DynamicPropertyHelpers.CoerceBool("anything");
        Assert.True(result);
    }

    [Fact]
    public void CoerceInt_WithInt_ReturnsInt()
    {
        var result = DynamicPropertyHelpers.CoerceInt(42);
        Assert.Equal(42, result);
    }

    [Fact]
    public void CoerceInt_WithLong_ReturnsInt()
    {
        var result = DynamicPropertyHelpers.CoerceInt(42L);
        Assert.Equal(42, result);
    }

    [Fact]
    public void CoerceInt_WithDouble_ReturnsIntIfWholeNumber()
    {
        var result = DynamicPropertyHelpers.CoerceInt(42.0);
        Assert.Equal(42, result);
    }

    [Fact]
    public void CoerceInt_WithDecimal_ReturnsNull()
    {
        var result = DynamicPropertyHelpers.CoerceInt(42.5);
        Assert.Null(result);
    }

    [Fact]
    public void CoerceInt_WithString_ReturnsNull()
    {
        var result = DynamicPropertyHelpers.CoerceInt("42");
        Assert.Null(result);
    }

    [Fact]
    public void CoerceInt_WithNull_ReturnsNull()
    {
        var result = DynamicPropertyHelpers.CoerceInt(null);
        Assert.Null(result);
    }

    [Fact]
    public void CoerceStyle_WithDictionary_ReturnsDictionary()
    {
        var dict = new Dictionary<string, object?> { ["color"] = "red" };
        var result = DynamicPropertyHelpers.CoerceStyle(dict);
        Assert.Same(dict, result);
    }

    [Fact]
    public void CoerceStyle_WithJsonElement_ReturnsDeserializedDictionary()
    {
        var json = JsonDocument.Parse("{\"color\":\"red\",\"size\":\"large\"}");
        var result = DynamicPropertyHelpers.CoerceStyle(json.RootElement);
        Assert.NotNull(result);
        // JsonElement values are deserialized - they'll be JsonElements
        Assert.True(result.ContainsKey("color"));
        Assert.True(result.ContainsKey("size"));
        // The values will be JsonElements, so convert to string to check
        Assert.Equal("red", result["color"]?.ToString());
        Assert.Equal("large", result["size"]?.ToString());
    }

    [Fact]
    public void CoerceStyle_WithJsonString_ReturnsDeserializedDictionary()
    {
        var jsonString = "{\"color\":\"red\",\"size\":\"large\"}";
        var result = DynamicPropertyHelpers.CoerceStyle(jsonString);
        Assert.NotNull(result);
        Assert.True(result.ContainsKey("color"));
        Assert.True(result.ContainsKey("size"));
        Assert.Equal("red", result["color"]?.ToString());
        Assert.Equal("large", result["size"]?.ToString());
    }

    [Fact]
    public void CoerceStyle_WithString_ReturnsNull()
    {
        var result = DynamicPropertyHelpers.CoerceStyle("not a style");
        Assert.Null(result);
    }

    [Fact]
    public void CoerceStyle_WithNull_ReturnsNull()
    {
        var result = DynamicPropertyHelpers.CoerceStyle(null);
        Assert.Null(result);
    }

    [Fact]
    public void CoerceIdentity_ReturnsValueAsIs()
    {
        var obj = new { test = "value" };
        var result = DynamicPropertyHelpers.CoerceIdentity(obj);
        Assert.Same(obj, result);
    }

    [Fact]
    public void CoerceIdentity_WithNull_ReturnsNull()
    {
        var result = DynamicPropertyHelpers.CoerceIdentity(null);
        Assert.Null(result);
    }
}
