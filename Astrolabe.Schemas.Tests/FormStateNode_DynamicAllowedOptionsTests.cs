using Astrolabe.Controls;
using Xunit;

namespace Astrolabe.Schemas.Tests;

/// <summary>
/// Tests for dynamic AllowedOptions property and its effect on FieldOptions
/// </summary>
public class FormStateNode_DynamicAllowedOptionsTests
{
    [Fact]
    public void FieldOptions_WithoutAllowedOptions_ReturnsAllOptions()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        var fieldSchema = schema.AddChild("colorField", "string");
        fieldSchema.Field.Options = new[]
        {
            new FieldOption("Red", "red"),
            new FieldOption("Green", "green"),
            new FieldOption("Blue", "blue")
        };

        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?>());

        var editor = new ControlEditor();

        var definition = new DataControlDefinition("colorField");

        // Act
        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor
        );

        // Assert
        Assert.NotNull(formStateNode.FieldOptions);
        Assert.Equal(3, formStateNode.FieldOptions.Count);
    }

    [Fact]
    public void FieldOptions_WithAllowedOptions_FiltersToAllowedValues()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        var fieldSchema = schema.AddChild("colorField", "string");
        fieldSchema.Field.Options = new[]
        {
            new FieldOption("Red", "red"),
            new FieldOption("Green", "green"),
            new FieldOption("Blue", "blue")
        };

        schema.AddChild("allowedColors", "array");

        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?>
        {
            ["allowedColors"] = new[] { "red", "blue" }
        });

        var editor = new ControlEditor();

        var definition = new DataControlDefinition("colorField")
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.AllowedOptions),
                    Expr: new DataExpression("allowedColors")
                )
            ]
        };

        // Act
        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor
        );

        // Assert - should only have red and blue
        Assert.NotNull(formStateNode.FieldOptions);
        Assert.Equal(2, formStateNode.FieldOptions.Count);
        Assert.Contains(formStateNode.FieldOptions, opt => (string)opt.Value == "red");
        Assert.Contains(formStateNode.FieldOptions, opt => (string)opt.Value == "blue");
        Assert.DoesNotContain(formStateNode.FieldOptions, opt => (string)opt.Value == "green");
    }

    [Fact]
    public void FieldOptions_UpdatesReactively_WhenAllowedOptionsChange()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        var fieldSchema = schema.AddChild("colorField", "string");
        fieldSchema.Field.Options = new[]
        {
            new FieldOption("Red", "red"),
            new FieldOption("Green", "green"),
            new FieldOption("Blue", "blue")
        };

        schema.AddChild("allowedColors", "array");

        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?>
        {
            ["allowedColors"] = new[] { "red" }
        });

        var editor = new ControlEditor();

        var definition = new DataControlDefinition("colorField")
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.AllowedOptions),
                    Expr: new DataExpression("allowedColors")
                )
            ]
        };

        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor
        );

        Assert.Equal(1, formStateNode.FieldOptions?.Count);

        // Act - change allowed options
        var allowedChild = dataNode.GetChildForFieldRef("allowedColors");
        editor.SetValue(allowedChild!.Control, new[] { "red", "green", "blue" });

        // Assert - should now have all three
        Assert.Equal(3, formStateNode.FieldOptions?.Count);
    }

    [Fact]
    public void AllowedOptions_WithValueNotInOptions_CreatesNewFieldOption()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        var fieldSchema = schema.AddChild("colorField", "string");
        fieldSchema.Field.Options = new[]
        {
            new FieldOption("Red", "red"),
            new FieldOption("Green", "green")
        };

        schema.AddChild("allowedColors", "array");

        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?>
        {
            ["allowedColors"] = new[] { "red", "purple" } // purple not in original options
        });

        var editor = new ControlEditor();

        var definition = new DataControlDefinition("colorField")
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.AllowedOptions),
                    Expr: new DataExpression("allowedColors")
                )
            ]
        };

        // Act
        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor
        );

        // Assert - should have red and purple
        Assert.NotNull(formStateNode.FieldOptions);
        Assert.Equal(2, formStateNode.FieldOptions.Count);
        Assert.Contains(formStateNode.FieldOptions, opt => (string)opt.Value == "red");
        Assert.Contains(formStateNode.FieldOptions, opt => (string)opt.Value == "purple");

        // Purple should have been created with value as name
        var purpleOption = formStateNode.FieldOptions.First(opt => (string)opt.Value == "purple");
        Assert.Equal("purple", purpleOption.Name);
    }

    [Fact]
    public void AllowedOptions_WithEmptyArray_ReturnsAllOptions()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        var fieldSchema = schema.AddChild("colorField", "string");
        fieldSchema.Field.Options = new[]
        {
            new FieldOption("Red", "red"),
            new FieldOption("Green", "green"),
            new FieldOption("Blue", "blue")
        };

        schema.AddChild("allowedColors", "array");

        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?>
        {
            ["allowedColors"] = Array.Empty<string>()
        });

        var editor = new ControlEditor();

        var definition = new DataControlDefinition("colorField")
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.AllowedOptions),
                    Expr: new DataExpression("allowedColors")
                )
            ]
        };

        // Act
        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor
        );

        // Assert - empty array should return all options
        Assert.NotNull(formStateNode.FieldOptions);
        Assert.Equal(3, formStateNode.FieldOptions.Count);
    }
}
