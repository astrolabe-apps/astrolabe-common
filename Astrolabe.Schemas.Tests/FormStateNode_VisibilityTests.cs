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
    public void Visible_Should_Be_True_By_Default()
    {
        // Arrange & Act
        var formState = TestHelpers.CreateFormStateNode();

        // Assert
        // Temporary: returns true until visibility scripting is implemented
        Assert.True(formState.Visible);
    }

    [Fact]
    public void Visible_Should_Be_False_When_Definition_Hidden_Is_True()
    {
        // Arrange
        var definition = TestHelpers.CreateDataControl(".", hidden: true);

        // Act
        var formState = TestHelpers.CreateFormStateNode(definition: definition);

        // Assert
        Assert.False(formState.Visible);
    }

    [Fact]
    public void Visible_Should_Be_True_When_Definition_Hidden_Is_False()
    {
        // Arrange
        var definition = TestHelpers.CreateDataControl(".", hidden: false);

        // Act
        var formState = TestHelpers.CreateFormStateNode(definition: definition);

        // Assert
        Assert.True(formState.Visible);
    }

    [Fact]
    public void Visible_Should_Inherit_Parent_Visibility_When_Parent_Is_False()
    {
        // Arrange
        var parentDefinition = TestHelpers.CreateDataControl(".", hidden: true);
        var childDefinition = TestHelpers.CreateDataControl(".");
        var editor = new ControlEditor();

        // Act
        var parentState = TestHelpers.CreateFormStateNode(
            definition: parentDefinition,
            childKey: "parent",
            editor: editor);

        var childState = TestHelpers.CreateChildFormStateNode(
            parentNode: parentState,
            editor: editor,
            definition: childDefinition);

        // Assert
        Assert.False(parentState.Visible);
        // Debug output to see what we're actually getting
        var actualChildVisible = childState.Visible;
        Assert.False(actualChildVisible); // Should inherit parent's false
    }

    [Fact]
    public void Visible_Should_Inherit_Parent_Visibility_When_Parent_Is_Visible()
    {
        // Arrange
        var parentDefinition = TestHelpers.CreateDataControl("."); // hidden: null -> visible: true
        var childDefinition = TestHelpers.CreateDataControl(".", hidden: false);
        var editor = new ControlEditor();

        // Act
        var parentState = TestHelpers.CreateFormStateNode(
            definition: parentDefinition,
            childKey: "parent",
            editor: editor);

        var childState = TestHelpers.CreateChildFormStateNode(
            parentNode: parentState,
            editor: editor,
            definition: childDefinition);

        // Assert
        // Temporary: parent returns true instead of null until visibility scripting is implemented
        Assert.True(parentState.Visible);
        Assert.True(childState.Visible); // Child is also visible
    }

    [Fact]
    public void Visible_Should_Use_Child_Definition_When_Parent_Is_True()
    {
        // Arrange
        var parentDefinition = TestHelpers.CreateDataControl(".", hidden: false);
        var childDefinition = TestHelpers.CreateDataControl(".", hidden: true);
        var editor = new ControlEditor();

        // Act
        var parentState = TestHelpers.CreateFormStateNode(
            definition: parentDefinition,
            childKey: "parent",
            editor: editor);

        var childState = TestHelpers.CreateChildFormStateNode(
            parentNode: parentState,
            editor: editor,
            definition: childDefinition);

        // Assert
        Assert.True(parentState.Visible);
        Assert.False(childState.Visible); // Should use child's definition
    }

    [Fact]
    public void Visible_Should_Be_False_When_DataNode_Is_Undefined()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField");

        // Create undefined control
        var undefinedControl = Control.CreateUndefined();
        var undefinedDataNode = new SchemaDataNode(schema, undefinedControl, null);

        // Act
        var formState = TestHelpers.CreateFormStateNode(dataNode: undefinedDataNode);

        // Assert
        Assert.False(formState.Visible); // Should be hidden when data is undefined
    }
}
