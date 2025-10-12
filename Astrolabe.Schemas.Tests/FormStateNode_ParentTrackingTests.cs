using Astrolabe.Controls;
using Astrolabe.Schemas;
using Xunit;

namespace Astrolabe.Schemas.Tests;

/// <summary>
/// Debug tests to verify parent tracking works
/// </summary>
public class FormStateNode_ParentTrackingTests
{
    [Fact]
    public void Parent_Property_Values_Should_Be_Accessible()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField");
        var dataNode = TestHelpers.CreateTestDataNode(schema, "test value");
        var parentDefinition = TestHelpers.CreateDataControl(".", hidden: true, readonly_: true, disabled: true);
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

        // Assert - verify parent properties are set correctly
        Assert.False(parentState.Visible); // hidden: true => visible: false
        Assert.True(parentState.Readonly);
        Assert.True(parentState.Disabled);
    }

    [Fact]
    public void Parent_State_Should_Be_Accessible_From_Child()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField");
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

        // Verify parent is set up correctly BEFORE creating child
        var parentVisible = parentState.Visible;
        Assert.False(parentVisible);

        // Now create child
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

        // Check child's visibility
        var childVisible = childState.Visible;

        // Output for debugging
        Assert.False(childVisible); // Should inherit parent's false
    }
}
