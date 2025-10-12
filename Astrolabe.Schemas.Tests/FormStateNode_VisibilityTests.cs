using Astrolabe.Controls;
using Astrolabe.Schemas;
using Xunit;

namespace Astrolabe.Schemas.Tests;

/// <summary>
/// Tests for Phase 1: Visibility reactivity
/// </summary>
public class FormStateNode_VisibilityTests
{
    [Fact]
    public void Visible_Should_Be_Null_By_Default()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField");
        var dataNode = TestHelpers.CreateTestDataNode(schema, "test value");
        var definition = TestHelpers.CreateDataControl(".");
        var editor = new ControlEditor();

        // Act
        var formState = new FormStateNode(
            definition: definition,
            form: null,
            parent: dataNode,
            parentNode: null,
            dataNode: dataNode,
            childIndex: 0,
            childKey: "key1",
            editor: editor
        );

        // Assert
        Assert.Null(formState.Visible);
    }

    [Fact]
    public void Visible_Should_Be_False_When_Definition_Hidden_Is_True()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField");
        var dataNode = TestHelpers.CreateTestDataNode(schema, "test value");
        var definition = TestHelpers.CreateDataControl(".", hidden: true);
        var editor = new ControlEditor();

        // Act
        var formState = new FormStateNode(
            definition: definition,
            form: null,
            parent: dataNode,
            parentNode: null,
            dataNode: dataNode,
            childIndex: 0,
            childKey: "key1",
            editor: editor
        );

        // Assert
        Assert.False(formState.Visible);
    }

    [Fact]
    public void Visible_Should_Be_True_When_Definition_Hidden_Is_False()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField");
        var dataNode = TestHelpers.CreateTestDataNode(schema, "test value");
        var definition = TestHelpers.CreateDataControl(".", hidden: false);
        var editor = new ControlEditor();

        // Act
        var formState = new FormStateNode(
            definition: definition,
            form: null,
            parent: dataNode,
            parentNode: null,
            dataNode: dataNode,
            childIndex: 0,
            childKey: "key1",
            editor: editor
        );

        // Assert
        Assert.True(formState.Visible);
    }

    [Fact]
    public void Visible_Should_Inherit_Parent_Visibility_When_Parent_Is_False()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parentField");
        var dataNode = TestHelpers.CreateTestDataNode(schema, "test value");
        var parentDefinition = TestHelpers.CreateDataControl(".", hidden: true);
        var childDefinition = TestHelpers.CreateDataControl(".");
        var editor = new ControlEditor();

        // Act
        var parentState = new FormStateNode(
            definition: parentDefinition,
            form: null,
            parent: dataNode,
            parentNode: null,
            dataNode: dataNode,
            childIndex: 0,
            childKey: "parent",
            editor: editor
        );

        var childState = new FormStateNode(
            definition: childDefinition,
            form: null,
            parent: dataNode,
            parentNode: parentState,
            dataNode: dataNode,
            childIndex: 0,
            childKey: "child",
            editor: editor
        );

        // Assert
        Assert.False(parentState.Visible);
        // Debug output to see what we're actually getting
        var actualChildVisible = childState.Visible;
        Assert.False(actualChildVisible); // Should inherit parent's false
    }

    [Fact]
    public void Visible_Should_Inherit_Parent_Visibility_When_Parent_Is_Null()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parentField");
        var dataNode = TestHelpers.CreateTestDataNode(schema, "test value");
        var parentDefinition = TestHelpers.CreateDataControl("."); // hidden: null
        var childDefinition = TestHelpers.CreateDataControl(".", hidden: false);
        var editor = new ControlEditor();

        // Act
        var parentState = new FormStateNode(
            definition: parentDefinition,
            form: null,
            parent: dataNode,
            parentNode: null,
            dataNode: dataNode,
            childIndex: 0,
            childKey: "parent",
            editor: editor
        );

        var childState = new FormStateNode(
            definition: childDefinition,
            form: null,
            parent: dataNode,
            parentNode: parentState,
            dataNode: dataNode,
            childIndex: 0,
            childKey: "child",
            editor: editor
        );

        // Assert
        Assert.Null(parentState.Visible);
        Assert.Null(childState.Visible); // Should inherit parent's null
    }

    [Fact]
    public void Visible_Should_Use_Child_Definition_When_Parent_Is_True()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parentField");
        var dataNode = TestHelpers.CreateTestDataNode(schema, "test value");
        var parentDefinition = TestHelpers.CreateDataControl(".", hidden: false);
        var childDefinition = TestHelpers.CreateDataControl(".", hidden: true);
        var editor = new ControlEditor();

        // Act
        var parentState = new FormStateNode(
            definition: parentDefinition,
            form: null,
            parent: dataNode,
            parentNode: null,
            dataNode: dataNode,
            childIndex: 0,
            childKey: "parent",
            editor: editor
        );

        var childState = new FormStateNode(
            definition: childDefinition,
            form: null,
            parent: dataNode,
            parentNode: parentState,
            dataNode: dataNode,
            childIndex: 0,
            childKey: "child",
            editor: editor
        );

        // Assert
        Assert.True(parentState.Visible);
        Assert.False(childState.Visible); // Should use child's definition
    }

    [Fact]
    public void Visible_Should_Be_False_When_DataNode_Is_Undefined()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField");
        var editor = new ControlEditor();

        // Create undefined control
        var undefinedControl = Control.Create(UndefinedValue.Instance);
        var undefinedDataNode = new SchemaDataNode(schema, undefinedControl, null);

        var definition = TestHelpers.CreateDataControl(".");

        // Act
        var formState = new FormStateNode(
            definition: definition,
            form: null,
            parent: undefinedDataNode,
            parentNode: null,
            dataNode: undefinedDataNode,
            childIndex: 0,
            childKey: "key1",
            editor: editor
        );

        // Assert
        Assert.False(formState.Visible); // Should be hidden when data is undefined
    }
}
