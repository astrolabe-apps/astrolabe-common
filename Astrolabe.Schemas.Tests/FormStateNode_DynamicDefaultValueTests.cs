using Astrolabe.Controls;
using Xunit;

namespace Astrolabe.Schemas.Tests;

/// <summary>
/// Tests for dynamic DefaultValue, ActionData, and GridColumns properties
/// </summary>
public class FormStateNode_DynamicDefaultValueTests
{
    [Fact]
    public void DefaultValue_WithDynamicExpression_UpdatesBasedOnData()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        schema.AddChild("defaultSource", "string");

        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?>
        {
            ["defaultSource"] = "Dynamic Default"
        });

        var editor = new ControlEditor();

        var definition = new DataControlDefinition("testField")
        {
            DefaultValue = "Static Default",
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.DefaultValue),
                    Expr: new DataExpression("defaultSource")
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
        Assert.IsType<DataControlDefinition>(formStateNode.Definition);
        var dataDefinition = (DataControlDefinition)formStateNode.Definition;
        Assert.Equal("Dynamic Default", dataDefinition.DefaultValue);
    }

    [Fact]
    public void DefaultValue_UpdatesReactively_WhenSourceChanges()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        schema.AddChild("defaultSource", "string");

        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?>
        {
            ["defaultSource"] = "Initial Default"
        });

        var editor = new ControlEditor();

        var definition = new DataControlDefinition("testField")
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.DefaultValue),
                    Expr: new DataExpression("defaultSource")
                )
            ]
        };

        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor
        );

        var dataDefinition = (DataControlDefinition)formStateNode.Definition;
        Assert.Equal("Initial Default", dataDefinition.DefaultValue);

        // Act - change the default source
        var defaultChild = dataNode.GetChildForFieldRef("defaultSource");
        editor.SetValue(defaultChild!.Control, "Updated Default");

        // Assert
        dataDefinition = (DataControlDefinition)formStateNode.Definition;
        Assert.Equal("Updated Default", dataDefinition.DefaultValue);
    }

    [Fact]
    public void DefaultValue_SupportsComplexTypes()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        schema.AddChild("defaultObject", "object");

        var defaultObj = new { name = "Test", value = 42 };

        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?>
        {
            ["defaultObject"] = defaultObj
        });

        var editor = new ControlEditor();

        var definition = new DataControlDefinition("testField")
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.DefaultValue),
                    Expr: new DataExpression("defaultObject")
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
        var dataDefinition = (DataControlDefinition)formStateNode.Definition;
        // Complex objects get serialized to JSON strings in Controls
        Assert.NotNull(dataDefinition.DefaultValue);
        var jsonString = dataDefinition.DefaultValue as string;
        Assert.NotNull(jsonString);
        Assert.Contains("\"name\"", jsonString);
        Assert.Contains("\"Test\"", jsonString);
        Assert.Contains("42", jsonString);
    }

    [Fact]
    public void ActionData_WithDynamicExpression_UpdatesBasedOnData()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        schema.AddChild("actionSource", "string");

        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?>
        {
            ["actionSource"] = "dynamic-action-id"
        });

        var editor = new ControlEditor();

        var definition = new ActionControlDefinition(
            ActionId: "testAction",
            ActionData: "static-action-id",
            Icon: null,
            ActionStyle: null,
            IconPlacement: null,
            DisableType: null
        )
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.ActionData),
                    Expr: new DataExpression("actionSource")
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
        Assert.IsType<ActionControlDefinition>(formStateNode.Definition);
        var actionDefinition = (ActionControlDefinition)formStateNode.Definition;
        Assert.Equal("dynamic-action-id", actionDefinition.ActionData);
    }

    [Fact]
    public void ActionData_UpdatesReactively_WhenSourceChanges()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        schema.AddChild("actionSource", "string");

        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?>
        {
            ["actionSource"] = "initial-action"
        });

        var editor = new ControlEditor();

        var definition = new ActionControlDefinition(
            ActionId: "testAction",
            ActionData: null,
            Icon: null,
            ActionStyle: null,
            IconPlacement: null,
            DisableType: null
        )
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.ActionData),
                    Expr: new DataExpression("actionSource")
                )
            ]
        };

        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor
        );

        var actionDefinition = (ActionControlDefinition)formStateNode.Definition;
        Assert.Equal("initial-action", actionDefinition.ActionData);

        // Act - change the action source
        var actionChild = dataNode.GetChildForFieldRef("actionSource");
        editor.SetValue(actionChild!.Control, "updated-action");

        // Assert
        actionDefinition = (ActionControlDefinition)formStateNode.Definition;
        Assert.Equal("updated-action", actionDefinition.ActionData);
    }

    [Fact]
    public void GridColumns_WithDynamicExpression_UpdatesForGroupedControls()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        schema.AddChild("columnCount", "number");

        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?>
        {
            ["columnCount"] = 3
        });

        var editor = new ControlEditor();

        var definition = new GroupedControlsDefinition()
        {
            GroupOptions = new GridRenderer(Columns: 2, RowClass: null, CellClass: null),
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.GridColumns),
                    Expr: new DataExpression("columnCount")
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
        Assert.IsType<GroupedControlsDefinition>(formStateNode.Definition);
        var groupDefinition = (GroupedControlsDefinition)formStateNode.Definition;
        Assert.IsType<GridRenderer>(groupDefinition.GroupOptions);
        var gridRenderer = (GridRenderer)groupDefinition.GroupOptions;
        Assert.Equal(3, gridRenderer.Columns);
    }

    [Fact]
    public void GridColumns_UpdatesReactively_WhenSourceChanges()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        schema.AddChild("columnCount", "number");

        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?>
        {
            ["columnCount"] = 2
        });

        var editor = new ControlEditor();

        var definition = new GroupedControlsDefinition()
        {
            GroupOptions = new GridRenderer(Columns: 1, RowClass: null, CellClass: null),
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.GridColumns),
                    Expr: new DataExpression("columnCount")
                )
            ]
        };

        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor
        );

        var groupDefinition = (GroupedControlsDefinition)formStateNode.Definition;
        var gridRenderer = (GridRenderer)groupDefinition.GroupOptions!;
        Assert.Equal(2, gridRenderer.Columns);

        // Act - change the column count
        var columnChild = dataNode.GetChildForFieldRef("columnCount");
        editor.SetValue(columnChild!.Control, 4);

        // Assert
        groupDefinition = (GroupedControlsDefinition)formStateNode.Definition;
        gridRenderer = (GridRenderer)groupDefinition.GroupOptions!;
        Assert.Equal(4, gridRenderer.Columns);
    }

    [Fact]
    public void GridColumns_WithDataGroupRenderOptions_UpdatesCorrectly()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        schema.AddChild("columnCount", "number");

        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?>
        {
            ["columnCount"] = 3
        });

        var editor = new ControlEditor();

        var definition = new DataControlDefinition("arrayField")
        {
            RenderOptions = new DataGroupRenderOptions(
                GroupOptions: new GridRenderer(Columns: 2, RowClass: null, CellClass: null)
            ),
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.GridColumns),
                    Expr: new DataExpression("columnCount")
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
        Assert.IsType<DataControlDefinition>(formStateNode.Definition);
        var dataDefinition = (DataControlDefinition)formStateNode.Definition;
        Assert.IsType<DataGroupRenderOptions>(dataDefinition.RenderOptions);
        var renderOptions = (DataGroupRenderOptions)dataDefinition.RenderOptions!;
        Assert.IsType<GridRenderer>(renderOptions.GroupOptions);
        var gridRenderer = (GridRenderer)renderOptions.GroupOptions!;
        Assert.Equal(3, gridRenderer.Columns);
    }

    [Fact]
    public void GridColumns_WithNonInteger_IgnoresUpdate()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        schema.AddChild("columnCount", "string");

        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?>
        {
            ["columnCount"] = "not a number"
        });

        var editor = new ControlEditor();

        var definition = new GroupedControlsDefinition()
        {
            GroupOptions = new GridRenderer(Columns: 2, RowClass: null, CellClass: null),
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.GridColumns),
                    Expr: new DataExpression("columnCount")
                )
            ]
        };

        // Act
        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor
        );

        // Assert - should have null (coerced from string)
        var groupDefinition = (GroupedControlsDefinition)formStateNode.Definition;
        var gridRenderer = (GridRenderer)groupDefinition.GroupOptions!;
        Assert.Null(gridRenderer.Columns);
    }
}
