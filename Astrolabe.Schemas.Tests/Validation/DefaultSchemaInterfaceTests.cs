using Astrolabe.Controls;
using Astrolabe.Schemas;
using Xunit;

namespace Astrolabe.Schemas.Tests.Validation;

/// <summary>
/// Unit tests for DefaultSchemaInterface validation methods
/// </summary>
public class DefaultSchemaInterfaceTests
{
    private readonly DefaultSchemaInterface _schemaInterface = DefaultSchemaInterface.Instance;

    [Fact]
    public void IsEmptyValue_Should_Return_True_For_Null()
    {
        // Arrange
        var field = new SimpleSchemaField("string", "test");

        // Act
        var result = _schemaInterface.IsEmptyValue(field, null);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void IsEmptyValue_Should_Return_True_For_Empty_String()
    {
        // Arrange
        var field = new SimpleSchemaField("string", "test");

        // Act
        var result = _schemaInterface.IsEmptyValue(field, "");

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void IsEmptyValue_Should_Return_True_For_Whitespace_String()
    {
        // Arrange
        var field = new SimpleSchemaField("string", "test");

        // Act
        var result = _schemaInterface.IsEmptyValue(field, "   ");

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void IsEmptyValue_Should_Return_False_For_Non_Empty_String()
    {
        // Arrange
        var field = new SimpleSchemaField("string", "test");

        // Act
        var result = _schemaInterface.IsEmptyValue(field, "hello");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void IsEmptyValue_Should_Return_True_For_Empty_Array()
    {
        // Arrange
        var field = new SimpleSchemaField("string", "test") { Collection = true };

        // Act
        var result = _schemaInterface.IsEmptyValue(field, Array.Empty<object>());

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void IsEmptyValue_Should_Return_False_For_Non_Empty_Array()
    {
        // Arrange
        var field = new SimpleSchemaField("string", "test") { Collection = true };

        // Act
        var result = _schemaInterface.IsEmptyValue(field, new[] { "item" });

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void ControlLength_Should_Return_String_Length()
    {
        // Arrange
        var field = new SimpleSchemaField("string", "test");
        var control = Control.Create("hello");

        // Act
        var length = _schemaInterface.ControlLength(field, control);

        // Assert
        Assert.Equal(5, length);
    }

    [Fact]
    public void ControlLength_Should_Return_Zero_For_Null_String()
    {
        // Arrange
        var field = new SimpleSchemaField("string", "test");
        var control = Control.Create<string?>(null);

        // Act
        var length = _schemaInterface.ControlLength(field, control);

        // Assert
        Assert.Equal(0, length);
    }

    [Fact]
    public void ControlLength_Should_Return_Array_Count()
    {
        // Arrange
        var field = new SimpleSchemaField("string", "test") { Collection = true };
        var control = Control.Create(new List<string> { "a", "b", "c" });

        // Act
        var length = _schemaInterface.ControlLength(field, control);

        // Assert
        Assert.Equal(3, length);
    }

    [Fact]
    public void ControlLength_Should_Return_Zero_For_Non_String_Non_Array()
    {
        // Arrange
        var field = new SimpleSchemaField("number", "test");
        var control = Control.Create(123);

        // Act
        var length = _schemaInterface.ControlLength(field, control);

        // Assert
        Assert.Equal(0, length);
    }

    [Fact]
    public void ValidationMessageText_Should_Return_NotEmpty_Message()
    {
        // Arrange
        var field = new SimpleSchemaField("string", "test");

        // Act
        var message = _schemaInterface.ValidationMessageText(
            field,
            ValidationMessageType.NotEmpty,
            null,
            null);

        // Assert
        Assert.Equal("This field is required", message);
    }

    [Fact]
    public void ValidationMessageText_Should_Return_MinLength_Message()
    {
        // Arrange
        var field = new SimpleSchemaField("string", "test");

        // Act
        var message = _schemaInterface.ValidationMessageText(
            field,
            ValidationMessageType.MinLength,
            2,
            5);

        // Assert
        Assert.Equal("Length must be at least 5", message);
    }

    [Fact]
    public void ValidationMessageText_Should_Return_MaxLength_Message()
    {
        // Arrange
        var field = new SimpleSchemaField("string", "test");

        // Act
        var message = _schemaInterface.ValidationMessageText(
            field,
            ValidationMessageType.MaxLength,
            15,
            10);

        // Assert
        Assert.Equal("Length must be no more than 10", message);
    }

    [Fact]
    public void ValidationMessageText_Should_Return_NotBeforeDate_Message()
    {
        // Arrange
        var field = new SimpleSchemaField("date", "test");
        var minDateMillis = new DateTimeOffset(new DateTime(2021, 1, 1, 0, 0, 0, DateTimeKind.Utc)).ToUnixTimeMilliseconds();

        // Act
        var message = _schemaInterface.ValidationMessageText(
            field,
            ValidationMessageType.NotBeforeDate,
            null,
            minDateMillis);

        // Assert
        Assert.Contains("must not be before", message);
        // Just check the date is in the message, timezone might affect exact format
        Assert.Matches(@"202[01]-\d{2}-\d{2}", message);
    }

    [Fact]
    public void ValidationMessageText_Should_Return_NotAfterDate_Message()
    {
        // Arrange
        var field = new SimpleSchemaField("date", "test");
        var maxDateMillis = new DateTimeOffset(new DateTime(2022, 12, 31, 0, 0, 0, DateTimeKind.Utc)).ToUnixTimeMilliseconds();

        // Act
        var message = _schemaInterface.ValidationMessageText(
            field,
            ValidationMessageType.NotAfterDate,
            null,
            maxDateMillis);

        // Assert
        Assert.Contains("must not be after", message);
        // Just check the date is in the message, timezone might affect exact format
        Assert.Matches(@"2022-\d{2}-\d{2}", message);
    }

    [Fact]
    public void ParseToMillis_Should_Convert_DateTime()
    {
        // Arrange
        var field = new SimpleSchemaField("date", "test");
        var date = new DateTime(2022, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        // Act
        var millis = _schemaInterface.ParseToMillis(field, date);

        // Assert
        var expected = new DateTimeOffset(date).ToUnixTimeMilliseconds();
        Assert.Equal(expected, millis);
    }

    [Fact]
    public void ParseToMillis_Should_Convert_DateTimeOffset()
    {
        // Arrange
        var field = new SimpleSchemaField("date", "test");
        var date = new DateTimeOffset(2022, 1, 1, 0, 0, 0, TimeSpan.Zero);

        // Act
        var millis = _schemaInterface.ParseToMillis(field, date);

        // Assert
        var expected = date.ToUnixTimeMilliseconds();
        Assert.Equal(expected, millis);
    }

    [Fact]
    public void ParseToMillis_Should_Convert_DateOnly()
    {
        // Arrange
        var field = new SimpleSchemaField("date", "test");
        var date = new DateOnly(2022, 1, 1);

        // Act
        var millis = _schemaInterface.ParseToMillis(field, date);

        // Assert
        var expected = new DateTimeOffset(date.ToDateTime(TimeOnly.MinValue)).ToUnixTimeMilliseconds();
        Assert.Equal(expected, millis);
    }

    [Fact]
    public void ParseToMillis_Should_Convert_String_Date()
    {
        // Arrange
        var field = new SimpleSchemaField("date", "test");
        var dateString = "2022-01-01";

        // Act
        var millis = _schemaInterface.ParseToMillis(field, dateString);

        // Assert
        Assert.NotEqual(0, millis); // Should have parsed successfully
    }

    [Fact]
    public void ParseToMillis_Should_Return_Zero_For_Invalid_Value()
    {
        // Arrange
        var field = new SimpleSchemaField("date", "test");

        // Act
        var millis = _schemaInterface.ParseToMillis(field, 123);

        // Assert
        Assert.Equal(0, millis);
    }
}
