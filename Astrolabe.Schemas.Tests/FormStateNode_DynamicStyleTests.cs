using Astrolabe.Controls;
using Xunit;

namespace Astrolabe.Schemas.Tests;

/// <summary>
/// Tests for dynamic Style and LayoutStyle properties
/// </summary>
public class FormStateNode_DynamicStyleTests
{
    [Fact]
    public void Style_WithoutDynamic_ReturnsNull()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent");
        var dataNode = TestHelpers.CreateTestDataNode(schema);
        var editor = new ControlEditor();

        var definition = new DataControlDefinition("testField")
        {
            Title = "Test"
        };

        // Act
        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor
        );

        // Assert
        Assert.Null(formStateNode.Style);
    }

    [Fact]
    public void Style_WithDynamicExpression_ReturnsEvaluatedStyle()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        schema.AddChild("styleData", "object");

        var styleDict = new Dictionary<string, object?>
        {
            ["color"] = "red",
            ["fontSize"] = "16px"
        };

        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?>
        {
            ["styleData"] = styleDict
        });

        var editor = new ControlEditor();

        var definition = new DataControlDefinition("testField")
        {
            Title = "Test",
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Style),
                    Expr: new DataExpression("styleData")
                )
            ]
        };

        // Act
        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor
        );

        // Assert
        Assert.NotNull(formStateNode.Style);
        // Values may be JsonElements when deserialized from JSON strings
        Assert.Equal("red", formStateNode.Style["color"]?.ToString());
        Assert.Equal("16px", formStateNode.Style["fontSize"]?.ToString());
    }

    [Fact]
    public void Style_UpdatesReactively_WhenSourceChanges()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        schema.AddChild("styleData", "object");

        var styleDict = new Dictionary<string, object?>
        {
            ["color"] = "red"
        };

        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?>
        {
            ["styleData"] = styleDict
        });

        var editor = new ControlEditor();

        var definition = new DataControlDefinition("testField")
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Style),
                    Expr: new DataExpression("styleData")
                )
            ]
        };

        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor
        );

        Assert.Equal("red", formStateNode.Style?["color"]?.ToString());

        // Act - change the style data
        var styleChild = dataNode.GetChildForFieldRef("styleData");
        var newStyle = new Dictionary<string, object?> { ["color"] = "blue" };
        editor.SetValue(styleChild!.Control, newStyle);

        // Assert
        Assert.Equal("blue", formStateNode.Style?["color"]?.ToString());
    }

    [Fact]
    public void LayoutStyle_WithDynamicExpression_ReturnsEvaluatedStyle()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        schema.AddChild("layoutData", "object");

        var layoutDict = new Dictionary<string, object?>
        {
            ["width"] = "100%",
            ["height"] = "auto"
        };

        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?>
        {
            ["layoutData"] = layoutDict
        });

        var editor = new ControlEditor();

        var definition = new DataControlDefinition("testField")
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.LayoutStyle),
                    Expr: new DataExpression("layoutData")
                )
            ]
        };

        // Act
        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor
        );

        // Assert
        Assert.NotNull(formStateNode.LayoutStyle);
        Assert.Equal("100%", formStateNode.LayoutStyle["width"]?.ToString());
        Assert.Equal("auto", formStateNode.LayoutStyle["height"]?.ToString());
    }

    [Fact]
    public void Style_WithNonDictionary_ReturnsNull()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        schema.AddChild("stringField", "string");

        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?>
        {
            ["stringField"] = "not a style"
        });

        var editor = new ControlEditor();

        var definition = new DataControlDefinition("testField")
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Style),
                    Expr: new DataExpression("stringField")
                )
            ]
        };

        // Act
        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor
        );

        // Assert
        Assert.Null(formStateNode.Style);
    }

    [Fact]
    public void BothStyleAndLayoutStyle_CanBeSetIndependently()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        schema.AddChild("styleData", "object");
        schema.AddChild("layoutData", "object");

        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?>
        {
            ["styleData"] = new Dictionary<string, object?> { ["color"] = "red" },
            ["layoutData"] = new Dictionary<string, object?> { ["width"] = "100%" }
        });

        var editor = new ControlEditor();

        var definition = new DataControlDefinition("testField")
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Style),
                    Expr: new DataExpression("styleData")
                ),
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.LayoutStyle),
                    Expr: new DataExpression("layoutData")
                )
            ]
        };

        // Act
        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor
        );

        // Assert
        Assert.NotNull(formStateNode.Style);
        Assert.Equal("red", formStateNode.Style["color"]?.ToString());

        Assert.NotNull(formStateNode.LayoutStyle);
        Assert.Equal("100%", formStateNode.LayoutStyle["width"]?.ToString());
    }
}
