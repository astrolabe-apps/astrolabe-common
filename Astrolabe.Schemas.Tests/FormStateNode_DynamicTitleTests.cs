using Astrolabe.Controls;
using Xunit;

namespace Astrolabe.Schemas.Tests;

/// <summary>
/// Tests for dynamic title evaluation in FormStateNode
/// </summary>
public class FormStateNode_DynamicTitleTests
{
    [Fact]
    public void StaticTitle_WithoutDynamicProperty_ReturnsStaticTitle()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent");
        var dataNode = TestHelpers.CreateTestDataNode(schema);
        var editor = new ControlEditor();

        var definition = new DataControlDefinition("testField")
        {
            Title = "My Static Title"
        };

        // Act
        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor
        );

        // Assert
        Assert.Equal("My Static Title", formStateNode.Definition.Title);
    }

    [Fact]
    public void DynamicTitle_WithDataExpression_ReturnsEvaluatedTitle()
    {
        // Arrange
        var (_, _, parentData) = TestHelpers.CreateParentChildSchema(
            "parent",
            "labelField",
            "Dynamic Title from Field"
        );
        var editor = new ControlEditor();

        var definition = new DataControlDefinition("testField")
        {
            Title = "Static Title",
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Label),
                    Expr: new DataExpression("labelField")
                )
            ]
        };

        // Act
        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: parentData,
            editor: editor
        );

        // Assert - dynamic title should override static title
        Assert.Equal("Dynamic Title from Field", formStateNode.Definition.Title);
    }

    [Fact]
    public void DynamicTitle_UpdatesWhenSourceFieldChanges()
    {
        // Arrange
        var (_, _, parentData) = TestHelpers.CreateParentChildSchema(
            "parent",
            "labelField",
            "Initial Title"
        );
        var editor = new ControlEditor();

        var definition = new DataControlDefinition("testField")
        {
            Title = "Static",
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Label),
                    Expr: new DataExpression("labelField")
                )
            ]
        };

        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: parentData,
            editor: editor
        );

        Assert.Equal("Initial Title", formStateNode.Definition.Title);

        // Act - change the source field
        var childNode = parentData.GetChildForFieldRef("labelField");
        editor.SetValue(childNode!.Control, "Updated Title");

        // Assert - title should update reactively
        Assert.Equal("Updated Title", formStateNode.Definition.Title);
    }

    [Fact]
    public void DynamicTitle_CoercesNumberToString()
    {
        // Arrange
        var (_, _, parentData) = TestHelpers.CreateParentChildSchema(
            "parent",
            "numberField",
            123
        );
        var editor = new ControlEditor();

        var definition = new DataControlDefinition("testField")
        {
            Title = "Static",
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Label),
                    Expr: new DataExpression("numberField")
                )
            ]
        };

        // Act
        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: parentData,
            editor: editor
        );

        // Assert
        Assert.Equal("123", formStateNode.Definition.Title);
    }

    [Fact]
    public void DynamicTitle_CoercesBooleanToString()
    {
        // Arrange
        var (_, _, parentData) = TestHelpers.CreateParentChildSchema(
            "parent",
            "boolField",
            true
        );
        var editor = new ControlEditor();

        var definition = new DataControlDefinition("testField")
        {
            Title = "Static",
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Label),
                    Expr: new DataExpression("boolField")
                )
            ]
        };

        // Act
        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: parentData,
            editor: editor
        );

        // Assert
        Assert.Equal("True", formStateNode.Definition.Title);
    }

    [Fact]
    public void DynamicTitle_CoercesNullToEmptyString()
    {
        // Arrange
        var (_, _, parentData) = TestHelpers.CreateParentChildSchema(
            "parent",
            "nullField",
            null
        );
        var editor = new ControlEditor();

        var definition = new DataControlDefinition("testField")
        {
            Title = "Static",
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Label),
                    Expr: new DataExpression("nullField")
                )
            ]
        };

        // Act
        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: parentData,
            editor: editor
        );

        // Assert
        Assert.Equal("", formStateNode.Definition.Title);
    }

    [Fact]
    public void DynamicTitle_WithDataMatchExpression_ReturnsMatchResult()
    {
        // Arrange
        var (_, _, parentData) = TestHelpers.CreateParentChildSchema(
            "parent",
            "role",
            "admin"
        );
        var editor = new ControlEditor();

        var definition = new DataControlDefinition("testField")
        {
            Title = "Static",
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Label),
                    Expr: new DataMatchExpression("role", "admin")
                )
            ]
        };

        // Act
        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: parentData,
            editor: editor
        );

        // Assert - boolean true should be coerced to "True"
        Assert.Equal("True", formStateNode.Definition.Title);
    }

    [Fact]
    public void DynamicTitle_WithNullDataNode_FallsBackToStaticTitle()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent");
        var parentDataNode = TestHelpers.CreateTestDataNode(schema);
        var editor = new ControlEditor();

        // Create a group control definition (no field, so no DataNode)
        var definition = new GroupedControlsDefinition()
        {
            Title = "Static Group Title",
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Label),
                    Expr: new DataExpression("someField")
                )
            ]
        };

        // Act - create child node with null dataNode (typical for GroupedControls without CompoundField)
        var parentFormStateNode = TestHelpers.CreateFormStateNode(
            dataNode: parentDataNode,
            editor: editor
        );

        var formStateNode = TestHelpers.CreateChildFormStateNode(
            parentNode: parentFormStateNode,
            editor: editor,
            definition: definition,
            dataNode: null, // No DataNode for group
            parent: parentDataNode
        );

        // Assert - should fall back to static title since DataNode is null
        Assert.Equal("Static Group Title", formStateNode.Definition.Title);
    }

    [Fact]
    public void MultipleFormStateNodes_TrackTitleIndependently()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        schema.AddChild("labelField1", "string");
        schema.AddChild("labelField2", "string");

        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?>
        {
            ["labelField1"] = "Title 1",
            ["labelField2"] = "Title 2"
        });

        var editor = new ControlEditor();

        var definition1 = new DataControlDefinition("field1")
        {
            Title = "Static",
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Label),
                    Expr: new DataExpression("labelField1")
                )
            ]
        };

        var definition2 = new DataControlDefinition("field2")
        {
            Title = "Static",
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Label),
                    Expr: new DataExpression("labelField2")
                )
            ]
        };

        var formStateNode1 = TestHelpers.CreateFormStateNode(
            definition: definition1,
            dataNode: dataNode,
            childKey: "test1",
            childIndex: 0,
            editor: editor
        );

        var formStateNode2 = TestHelpers.CreateFormStateNode(
            definition: definition2,
            dataNode: dataNode,
            childKey: "test2",
            childIndex: 1,
            editor: editor
        );

        Assert.Equal("Title 1", formStateNode1.Definition.Title);
        Assert.Equal("Title 2", formStateNode2.Definition.Title);

        // Act - change only labelField1
        var childNode1 = dataNode.GetChildForFieldRef("labelField1");
        editor.SetValue(childNode1!.Control, "Updated Title 1");

        // Assert - only formStateNode1 title should update
        Assert.Equal("Updated Title 1", formStateNode1.Definition.Title);
        Assert.Equal("Title 2", formStateNode2.Definition.Title); // Should remain unchanged
    }

    [Fact]
    public void DynamicTitle_WithComplexObject_SerializesToJson()
    {
        // Arrange
        var (_, _, parentData) = TestHelpers.CreateParentChildSchema(
            "parent",
            "complexField",
            new { name = "Test", value = 42 }
        );
        var editor = new ControlEditor();

        var definition = new DataControlDefinition("testField")
        {
            Title = "Static",
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Label),
                    Expr: new DataExpression("complexField")
                )
            ]
        };

        // Act
        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: parentData,
            editor: editor
        );

        // Assert - should be serialized as JSON
        Assert.NotNull(formStateNode.Definition.Title);
        Assert.Contains("name", formStateNode.Definition.Title);
        Assert.Contains("Test", formStateNode.Definition.Title);
        Assert.Contains("42", formStateNode.Definition.Title);
    }
}
