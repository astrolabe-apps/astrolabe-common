using Astrolabe.Controls;
using Xunit;

namespace Astrolabe.Schemas.Tests;

/// <summary>
/// Tests for dynamic Visible, Readonly, and Disabled properties
/// </summary>
public class FormStateNode_DynamicVisibilityTests
{
    [Fact]
    public void Visible_WithDynamicExpression_UpdatesBasedOnData()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        schema.AddChild("showField", "boolean");

        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?>
        {
            ["showField"] = true
        });

        var editor = new ControlEditor();

        var definition = new DataControlDefinition("testField")
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Visible),
                    Expr: new DataExpression("showField")
                )
            ]
        };

        // Act
        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor
        );

        // Assert - should be visible when showField is true
        Assert.True(formStateNode.Visible);
        Assert.False(formStateNode.Definition.Hidden);
    }

    [Fact]
    public void Visible_TogglesReactively_WhenDataChanges()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        schema.AddChild("showField", "boolean");

        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?>
        {
            ["showField"] = true
        });

        var editor = new ControlEditor();

        var definition = new DataControlDefinition("testField")
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Visible),
                    Expr: new DataExpression("showField")
                )
            ]
        };

        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor
        );

        Assert.True(formStateNode.Visible);

        // Act - hide the field
        var showChild = dataNode.GetChildForFieldRef("showField");
        editor.SetValue(showChild!.Control, false);

        // Assert - should now be hidden
        Assert.False(formStateNode.Visible);
        Assert.True(formStateNode.Definition.Hidden);
    }

    [Fact]
    public void Visible_InvertsExpression_BecauseDefinitionUsesHidden()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        schema.AddChild("visible", "boolean");

        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?>
        {
            ["visible"] = false // Visible expression returns false
        });

        var editor = new ControlEditor();

        var definition = new DataControlDefinition("testField")
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Visible),
                    Expr: new DataExpression("visible")
                )
            ]
        };

        // Act
        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor
        );

        // Assert - Visible=false means Hidden=true
        Assert.True(formStateNode.Definition.Hidden);
        Assert.False(formStateNode.Visible);
    }

    [Fact]
    public void Readonly_WithDynamicExpression_UpdatesBasedOnData()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        schema.AddChild("isReadonly", "boolean");

        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?>
        {
            ["isReadonly"] = true
        });

        var editor = new ControlEditor();

        var definition = new DataControlDefinition("testField")
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Readonly),
                    Expr: new DataExpression("isReadonly")
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
        Assert.True(formStateNode.Readonly);
        Assert.True(formStateNode.Definition.Readonly);
    }

    [Fact]
    public void Readonly_TogglesReactively_WhenDataChanges()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        schema.AddChild("isReadonly", "boolean");

        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?>
        {
            ["isReadonly"] = false
        });

        var editor = new ControlEditor();

        var definition = new DataControlDefinition("testField")
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Readonly),
                    Expr: new DataExpression("isReadonly")
                )
            ]
        };

        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor
        );

        Assert.False(formStateNode.Readonly);

        // Act - make readonly
        var readonlyChild = dataNode.GetChildForFieldRef("isReadonly");
        editor.SetValue(readonlyChild!.Control, true);

        // Assert
        Assert.True(formStateNode.Readonly);
        Assert.True(formStateNode.Definition.Readonly);
    }

    [Fact]
    public void Disabled_WithDynamicExpression_UpdatesBasedOnData()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        schema.AddChild("isDisabled", "boolean");

        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?>
        {
            ["isDisabled"] = true
        });

        var editor = new ControlEditor();

        var definition = new DataControlDefinition("testField")
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Disabled),
                    Expr: new DataExpression("isDisabled")
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
        Assert.True(formStateNode.Disabled);
        Assert.True(formStateNode.Definition.Disabled);
    }

    [Fact]
    public void Disabled_TogglesReactively_WhenDataChanges()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        schema.AddChild("isDisabled", "boolean");

        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?>
        {
            ["isDisabled"] = false
        });

        var editor = new ControlEditor();

        var definition = new DataControlDefinition("testField")
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Disabled),
                    Expr: new DataExpression("isDisabled")
                )
            ]
        };

        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor
        );

        Assert.False(formStateNode.Definition.Disabled);
        Assert.False(formStateNode.Disabled);

        // Act - disable the field
        var disabledChild = dataNode.GetChildForFieldRef("isDisabled");
        editor.SetValue(disabledChild!.Control, true);

        // Assert
        Assert.True(formStateNode.Definition.Disabled);
        Assert.True(formStateNode.Disabled);
    }

    [Fact]
    public void ParentReadonly_CascadesToChild_EvenWithDynamic()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        schema.AddChild("childReadonly", "boolean");

        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?>
        {
            ["childReadonly"] = false // Child's dynamic says not readonly
        });

        var editor = new ControlEditor();

        var parentDefinition = new GroupedControlsDefinition()
        {
            Readonly = true // But parent is readonly
        };

        var childDefinition = new DataControlDefinition("testField")
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Readonly),
                    Expr: new DataExpression("childReadonly")
                )
            ]
        };

        // Act - create parent and child
        var parentNode = TestHelpers.CreateFormStateNode(
            definition: parentDefinition,
            dataNode: dataNode,
            editor: editor
        );

        var childNode = TestHelpers.CreateChildFormStateNode(
            parentNode: parentNode,
            editor: editor,
            definition: childDefinition,
            parent: dataNode
        );

        // Assert - child should be readonly even though dynamic expression says false
        Assert.True(childNode.Readonly);
    }

    [Fact]
    public void ParentDisabled_CascadesToChild_EvenWithDynamic()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        schema.AddChild("childDisabled", "boolean");

        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?>
        {
            ["childDisabled"] = false // Child's dynamic says not disabled
        });

        var editor = new ControlEditor();

        var parentDefinition = new GroupedControlsDefinition()
        {
            Disabled = true // But parent is disabled
        };

        var childDefinition = new DataControlDefinition("testField")
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Disabled),
                    Expr: new DataExpression("childDisabled")
                )
            ]
        };

        // Act - create parent and child
        var parentNode = TestHelpers.CreateFormStateNode(
            definition: parentDefinition,
            dataNode: dataNode,
            editor: editor
        );

        var childNode = TestHelpers.CreateChildFormStateNode(
            parentNode: parentNode,
            editor: editor,
            definition: childDefinition,
            parent: dataNode
        );

        // Assert - child should be disabled even though dynamic expression says false
        Assert.True(childNode.Disabled);
    }

    [Fact]
    public void MultipleConditions_WithDataMatchExpression_WorkCorrectly()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        schema.AddChild("userRole", "string");

        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?>
        {
            ["userRole"] = "admin"
        });

        var editor = new ControlEditor();

        var definition = new DataControlDefinition("testField")
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Readonly),
                    Expr: new DataMatchExpression("userRole", "viewer")
                )
            ]
        };

        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor
        );

        // Assert - admin should not be readonly
        Assert.False(formStateNode.Readonly);

        // Act - change to viewer
        var roleChild = dataNode.GetChildForFieldRef("userRole");
        editor.SetValue(roleChild!.Control, "viewer");

        // Assert - viewer should be readonly
        Assert.True(formStateNode.Readonly);
    }
}
