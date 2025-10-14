using Astrolabe.Controls;
using Astrolabe.Schemas;
using Xunit;

namespace Astrolabe.Schemas.Tests;

/// <summary>
/// Tests for Phase 4: FieldOptions reactivity
/// </summary>
public class FormStateNode_FieldOptionsTests
{
    [Fact]
    public void FieldOptions_Should_Be_Null_When_Schema_Has_No_Options()
    {
        // Arrange & Act
        var formState = TestHelpers.CreateFormStateNode();

        // Assert
        Assert.Null(formState.FieldOptions);
    }

    [Fact]
    public void FieldOptions_Should_Return_Schema_Options_When_Available()
    {
        // Arrange
        var options = new List<FieldOption>
        {
            new("Option 1", "opt1"),
            new("Option 2", "opt2"),
            new("Option 3", "opt3")
        };
        var schema = TestHelpers.CreateTestSchema("testField", "string", null, options);
        var dataNode = TestHelpers.CreateTestDataNode(schema, "opt1");

        // Act
        var formState = TestHelpers.CreateFormStateNode(dataNode: dataNode);

        // Assert
        Assert.NotNull(formState.FieldOptions);
        Assert.Equal(3, formState.FieldOptions!.Count);
        Assert.Contains(formState.FieldOptions, opt => opt.Value?.ToString() == "opt1");
        Assert.Contains(formState.FieldOptions, opt => opt.Value?.ToString() == "opt2");
        Assert.Contains(formState.FieldOptions, opt => opt.Value?.ToString() == "opt3");
    }

    [Fact]
    public void FieldOptions_Should_Be_Null_When_DataNode_Is_Null()
    {
        // Arrange & Act
        var formState = TestHelpers.CreateFormStateNode(dataNode: null);

        // Assert
        Assert.Null(formState.FieldOptions);
    }

    [Fact]
    public void FieldOptions_Should_Contain_Correct_Names_And_Values()
    {
        // Arrange
        var options = new List<FieldOption>
        {
            new("Red", "red"),
            new("Green", "green"),
            new("Blue", "blue")
        };
        var schema = TestHelpers.CreateTestSchema("colorField", "string", null, options);
        var dataNode = TestHelpers.CreateTestDataNode(schema, "red");

        // Act
        var formState = TestHelpers.CreateFormStateNode(dataNode: dataNode);

        // Assert
        Assert.NotNull(formState.FieldOptions);
        var fieldOptions = formState.FieldOptions!.ToList();

        Assert.Equal("Red", fieldOptions[0].Name);
        Assert.Equal("red", fieldOptions[0].Value);

        Assert.Equal("Green", fieldOptions[1].Name);
        Assert.Equal("green", fieldOptions[1].Value);

        Assert.Equal("Blue", fieldOptions[2].Name);
        Assert.Equal("blue", fieldOptions[2].Value);
    }

    [Fact]
    public void FieldOptions_Should_Handle_Empty_Options_List()
    {
        // Arrange
        var options = new List<FieldOption>(); // Empty list
        var schema = TestHelpers.CreateTestSchema("testField", "string", null, options);
        var dataNode = TestHelpers.CreateTestDataNode(schema, "test value");

        // Act
        var formState = TestHelpers.CreateFormStateNode(dataNode: dataNode);

        // Assert - empty list remains as empty list (not null)
        Assert.NotNull(formState.FieldOptions);
        Assert.Empty(formState.FieldOptions);
    }

    [Fact]
    public void FieldOptions_Should_Work_With_Numeric_Values()
    {
        // Arrange
        var options = new List<FieldOption>
        {
            new("One", 1),
            new("Two", 2),
            new("Three", 3)
        };
        var schema = TestHelpers.CreateTestSchema("numberField", "number", null, options);
        var dataNode = TestHelpers.CreateTestDataNode(schema, 1);

        // Act
        var formState = TestHelpers.CreateFormStateNode(dataNode: dataNode);

        // Assert
        Assert.NotNull(formState.FieldOptions);
        var fieldOptions = formState.FieldOptions!.ToList();
        Assert.Equal(3, fieldOptions.Count);
        Assert.Equal(1, fieldOptions[0].Value);
        Assert.Equal(2, fieldOptions[1].Value);
        Assert.Equal(3, fieldOptions[2].Value);
    }
}
