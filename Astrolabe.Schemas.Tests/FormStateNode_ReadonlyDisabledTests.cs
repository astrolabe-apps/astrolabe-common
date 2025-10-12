using Astrolabe.Controls;
using Astrolabe.Schemas;
using Xunit;

namespace Astrolabe.Schemas.Tests;

/// <summary>
/// Tests for Phase 3: Readonly and Disabled reactivity
/// </summary>
public class FormStateNode_ReadonlyDisabledTests
{
    [Fact]
    public void Readonly_Should_Be_False_By_Default()
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
        Assert.False(formState.Readonly);
    }

    [Fact]
    public void Disabled_Should_Be_False_By_Default()
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
        Assert.False(formState.Disabled);
    }

    [Fact]
    public void Readonly_Should_Be_True_When_Definition_Readonly_Is_True()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField");
        var dataNode = TestHelpers.CreateTestDataNode(schema, "test value");
        var definition = TestHelpers.CreateDataControl(".", readonly_: true);
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
        Assert.True(formState.Readonly);
    }

    [Fact]
    public void Disabled_Should_Be_True_When_Definition_Disabled_Is_True()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField");
        var dataNode = TestHelpers.CreateTestDataNode(schema, "test value");
        var definition = TestHelpers.CreateDataControl(".", disabled: true);
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
        Assert.True(formState.Disabled);
    }

    [Fact]
    public void Readonly_Should_Inherit_From_Parent()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parentField");
        var dataNode = TestHelpers.CreateTestDataNode(schema, "test value");
        var parentDefinition = TestHelpers.CreateDataControl(".", readonly_: true);
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
        Assert.True(parentState.Readonly);
        Assert.True(childState.Readonly); // Should inherit parent's readonly
    }

    [Fact]
    public void Disabled_Should_Inherit_From_Parent()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parentField");
        var dataNode = TestHelpers.CreateTestDataNode(schema, "test value");
        var parentDefinition = TestHelpers.CreateDataControl(".", disabled: true);
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
        Assert.True(parentState.Disabled);
        Assert.True(childState.Disabled); // Should inherit parent's disabled
    }

    [Fact]
    public void Readonly_Parent_Override_Takes_Precedence_Over_Child_Definition()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parentField");
        var dataNode = TestHelpers.CreateTestDataNode(schema, "test value");
        var parentDefinition = TestHelpers.CreateDataControl(".", readonly_: true);
        var childDefinition = TestHelpers.CreateDataControl(".", readonly_: false);
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
        Assert.True(parentState.Readonly);
        Assert.True(childState.Readonly); // Parent readonly overrides child's false
    }

    [Fact]
    public void Disabled_Parent_Override_Takes_Precedence_Over_Child_Definition()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parentField");
        var dataNode = TestHelpers.CreateTestDataNode(schema, "test value");
        var parentDefinition = TestHelpers.CreateDataControl(".", disabled: true);
        var childDefinition = TestHelpers.CreateDataControl(".", disabled: false);
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
        Assert.True(parentState.Disabled);
        Assert.True(childState.Disabled); // Parent disabled overrides child's false
    }

    [Fact]
    public void Readonly_And_Disabled_Can_Be_True_Independently()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField");
        var dataNode = TestHelpers.CreateTestDataNode(schema, "test value");
        var readonlyDefinition = TestHelpers.CreateDataControl(".", readonly_: true, disabled: false);
        var disabledDefinition = TestHelpers.CreateDataControl(".", readonly_: false, disabled: true);
        var bothDefinition = TestHelpers.CreateDataControl(".", readonly_: true, disabled: true);
        var editor = new ControlEditor();

        // Act
        var readonlyState = new FormStateNode(
            definition: readonlyDefinition,
            form: null,
            parent: dataNode,
            parentNode: null,
            dataNode: dataNode,
            childIndex: 0,
            childKey: "readonly",
            editor: editor
        );

        var disabledState = new FormStateNode(
            definition: disabledDefinition,
            form: null,
            parent: dataNode,
            parentNode: null,
            dataNode: dataNode,
            childIndex: 0,
            childKey: "disabled",
            editor: editor
        );

        var bothState = new FormStateNode(
            definition: bothDefinition,
            form: null,
            parent: dataNode,
            parentNode: null,
            dataNode: dataNode,
            childIndex: 0,
            childKey: "both",
            editor: editor
        );

        // Assert
        Assert.True(readonlyState.Readonly);
        Assert.False(readonlyState.Disabled);

        Assert.False(disabledState.Readonly);
        Assert.True(disabledState.Disabled);

        Assert.True(bothState.Readonly);
        Assert.True(bothState.Disabled);
    }
}
