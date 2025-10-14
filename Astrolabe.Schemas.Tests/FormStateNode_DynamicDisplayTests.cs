using Astrolabe.Controls;
using Xunit;

namespace Astrolabe.Schemas.Tests;

/// <summary>
/// Tests for dynamic display evaluation in FormStateNode
/// </summary>
public class FormStateNode_DynamicDisplayTests
{
    [Fact]
    public void StaticTextDisplay_WithoutDynamicProperty_ReturnsStaticText()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent");
        var dataNode = TestHelpers.CreateTestDataNode(schema);
        var editor = new ControlEditor();

        var definition = new DisplayControlDefinition(
            new TextDisplay("Static Display Text")
        );

        // Act
        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor
        );

        // Assert
        var displayControl = Assert.IsType<DisplayControlDefinition>(formStateNode.Definition);
        var textDisplay = Assert.IsType<TextDisplay>(displayControl.DisplayData);
        Assert.Equal("Static Display Text", textDisplay.Text);
    }

    [Fact]
    public void DynamicTextDisplay_WithDataExpression_ReturnsEvaluatedText()
    {
        // Arrange
        var (_, _, parentData) = TestHelpers.CreateParentChildSchema(
            "parent",
            "displayField",
            "Dynamic Display from Field"
        );
        var editor = new ControlEditor();

        var definition = new DisplayControlDefinition(
            new TextDisplay("Static Text")
        )
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Display),
                    Expr: new DataExpression("displayField")
                )
            ]
        };

        // Act
        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: parentData,
            editor: editor
        );

        // Assert - dynamic display should override static text
        var displayControl = Assert.IsType<DisplayControlDefinition>(formStateNode.Definition);
        var textDisplay = Assert.IsType<TextDisplay>(displayControl.DisplayData);
        Assert.Equal("Dynamic Display from Field", textDisplay.Text);
    }

    [Fact]
    public void DynamicTextDisplay_UpdatesWhenSourceFieldChanges()
    {
        // Arrange
        var (_, _, parentData) = TestHelpers.CreateParentChildSchema(
            "parent",
            "displayField",
            "Initial Display"
        );
        var editor = new ControlEditor();

        var definition = new DisplayControlDefinition(
            new TextDisplay("Static")
        )
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Display),
                    Expr: new DataExpression("displayField")
                )
            ]
        };

        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: parentData,
            editor: editor
        );

        var displayControl = Assert.IsType<DisplayControlDefinition>(formStateNode.Definition);
        var textDisplay = Assert.IsType<TextDisplay>(displayControl.DisplayData);
        Assert.Equal("Initial Display", textDisplay.Text);

        // Act - change the source field
        var childNode = parentData.GetChildForFieldRef("displayField");
        editor.SetValue(childNode!.Control, "Updated Display");

        // Assert - display should update reactively
        displayControl = Assert.IsType<DisplayControlDefinition>(formStateNode.Definition);
        textDisplay = Assert.IsType<TextDisplay>(displayControl.DisplayData);
        Assert.Equal("Updated Display", textDisplay.Text);
    }

    [Fact]
    public void DynamicTextDisplay_CoercesNumberToString()
    {
        // Arrange
        var (_, _, parentData) = TestHelpers.CreateParentChildSchema(
            "parent",
            "numberField",
            42
        );
        var editor = new ControlEditor();

        var definition = new DisplayControlDefinition(
            new TextDisplay("Static")
        )
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Display),
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
        var displayControl = Assert.IsType<DisplayControlDefinition>(formStateNode.Definition);
        var textDisplay = Assert.IsType<TextDisplay>(displayControl.DisplayData);
        Assert.Equal("42", textDisplay.Text);
    }

    [Fact]
    public void DynamicTextDisplay_CoercesBooleanToString()
    {
        // Arrange
        var (_, _, parentData) = TestHelpers.CreateParentChildSchema(
            "parent",
            "boolField",
            true
        );
        var editor = new ControlEditor();

        var definition = new DisplayControlDefinition(
            new TextDisplay("Static")
        )
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Display),
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
        var displayControl = Assert.IsType<DisplayControlDefinition>(formStateNode.Definition);
        var textDisplay = Assert.IsType<TextDisplay>(displayControl.DisplayData);
        Assert.Equal("True", textDisplay.Text);
    }

    [Fact]
    public void DynamicTextDisplay_CoercesNullToEmptyString()
    {
        // Arrange
        var (_, _, parentData) = TestHelpers.CreateParentChildSchema(
            "parent",
            "nullField",
            null
        );
        var editor = new ControlEditor();

        var definition = new DisplayControlDefinition(
            new TextDisplay("Static")
        )
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Display),
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
        var displayControl = Assert.IsType<DisplayControlDefinition>(formStateNode.Definition);
        var textDisplay = Assert.IsType<TextDisplay>(displayControl.DisplayData);
        Assert.Equal("", textDisplay.Text);
    }

    [Fact]
    public void DynamicTextDisplay_WithComplexObject_SerializesToJson()
    {
        // Arrange
        var (_, _, parentData) = TestHelpers.CreateParentChildSchema(
            "parent",
            "complexField",
            new { name = "Test", value = 42 }
        );
        var editor = new ControlEditor();

        var definition = new DisplayControlDefinition(
            new TextDisplay("Static")
        )
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Display),
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
        var displayControl = Assert.IsType<DisplayControlDefinition>(formStateNode.Definition);
        var textDisplay = Assert.IsType<TextDisplay>(displayControl.DisplayData);
        Assert.NotNull(textDisplay.Text);
        Assert.Contains("name", textDisplay.Text);
        Assert.Contains("Test", textDisplay.Text);
        Assert.Contains("42", textDisplay.Text);
    }

    [Fact]
    public void DynamicHtmlDisplay_WithDataExpression_ReturnsEvaluatedHtml()
    {
        // Arrange
        var (_, _, parentData) = TestHelpers.CreateParentChildSchema(
            "parent",
            "htmlField",
            "<p>Dynamic HTML Content</p>"
        );
        var editor = new ControlEditor();

        var definition = new DisplayControlDefinition(
            new HtmlDisplay("<p>Static HTML</p>")
        )
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Display),
                    Expr: new DataExpression("htmlField")
                )
            ]
        };

        // Act
        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: parentData,
            editor: editor
        );

        // Assert - dynamic display should override static HTML
        var displayControl = Assert.IsType<DisplayControlDefinition>(formStateNode.Definition);
        var htmlDisplay = Assert.IsType<HtmlDisplay>(displayControl.DisplayData);
        Assert.Equal("<p>Dynamic HTML Content</p>", htmlDisplay.Html);
    }

    [Fact]
    public void DynamicHtmlDisplay_UpdatesWhenSourceFieldChanges()
    {
        // Arrange
        var (_, _, parentData) = TestHelpers.CreateParentChildSchema(
            "parent",
            "htmlField",
            "<p>Initial HTML</p>"
        );
        var editor = new ControlEditor();

        var definition = new DisplayControlDefinition(
            new HtmlDisplay("<p>Static</p>")
        )
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Display),
                    Expr: new DataExpression("htmlField")
                )
            ]
        };

        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: parentData,
            editor: editor
        );

        var displayControl = Assert.IsType<DisplayControlDefinition>(formStateNode.Definition);
        var htmlDisplay = Assert.IsType<HtmlDisplay>(displayControl.DisplayData);
        Assert.Equal("<p>Initial HTML</p>", htmlDisplay.Html);

        // Act - change the source field
        var childNode = parentData.GetChildForFieldRef("htmlField");
        editor.SetValue(childNode!.Control, "<p>Updated HTML</p>");

        // Assert - display should update reactively
        displayControl = Assert.IsType<DisplayControlDefinition>(formStateNode.Definition);
        htmlDisplay = Assert.IsType<HtmlDisplay>(displayControl.DisplayData);
        Assert.Equal("<p>Updated HTML</p>", htmlDisplay.Html);
    }

    [Fact]
    public void DynamicHtmlDisplay_CoercesNumberToString()
    {
        // Arrange
        var (_, _, parentData) = TestHelpers.CreateParentChildSchema(
            "parent",
            "numberField",
            123
        );
        var editor = new ControlEditor();

        var definition = new DisplayControlDefinition(
            new HtmlDisplay("<p>Static</p>")
        )
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Display),
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
        var displayControl = Assert.IsType<DisplayControlDefinition>(formStateNode.Definition);
        var htmlDisplay = Assert.IsType<HtmlDisplay>(displayControl.DisplayData);
        Assert.Equal("123", htmlDisplay.Html);
    }

    [Fact]
    public void DynamicDisplay_OnNonDisplayControl_DoesNotModifyDefinition()
    {
        // Arrange
        var (_, _, parentData) = TestHelpers.CreateParentChildSchema(
            "parent",
            "displayField",
            "Some Value"
        );
        var editor = new ControlEditor();

        var definition = new DataControlDefinition("testField")
        {
            Title = "Test",
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Display),
                    Expr: new DataExpression("displayField")
                )
            ]
        };

        // Act
        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: parentData,
            editor: editor
        );

        // Assert - should remain a DataControlDefinition (not modified to DisplayControl)
        Assert.IsType<DataControlDefinition>(formStateNode.Definition);
    }

    [Fact]
    public void DynamicDisplay_WithDataMatchExpression_CoercesBooleanToString()
    {
        // Arrange
        var (_, _, parentData) = TestHelpers.CreateParentChildSchema(
            "parent",
            "role",
            "admin"
        );
        var editor = new ControlEditor();

        var definition = new DisplayControlDefinition(
            new TextDisplay("Static")
        )
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Display),
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
        var displayControl = Assert.IsType<DisplayControlDefinition>(formStateNode.Definition);
        var textDisplay = Assert.IsType<TextDisplay>(displayControl.DisplayData);
        Assert.Equal("True", textDisplay.Text);
    }

    [Fact]
    public void DynamicDisplay_WithIconDisplay_DoesNotModify()
    {
        // Arrange
        var (_, _, parentData) = TestHelpers.CreateParentChildSchema(
            "parent",
            "displayField",
            "Some Value"
        );
        var editor = new ControlEditor();

        var definition = new DisplayControlDefinition(
            new IconDisplay("icon-class", null)
        )
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Display),
                    Expr: new DataExpression("displayField")
                )
            ]
        };

        // Act
        var formStateNode = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: parentData,
            editor: editor
        );

        // Assert - IconDisplay should remain unchanged (not text or HTML)
        var displayControl = Assert.IsType<DisplayControlDefinition>(formStateNode.Definition);
        var iconDisplay = Assert.IsType<IconDisplay>(displayControl.DisplayData);
        Assert.Equal("icon-class", iconDisplay.IconClass);
    }

    [Fact]
    public void MultipleDisplayControls_TrackDisplayIndependently()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("parent", "object");
        schema.AddChild("displayField1", "string");
        schema.AddChild("displayField2", "string");

        var dataNode = TestHelpers.CreateObjectDataNode(schema, new Dictionary<string, object?>
        {
            ["displayField1"] = "Display 1",
            ["displayField2"] = "Display 2"
        });

        var editor = new ControlEditor();

        var definition1 = new DisplayControlDefinition(
            new TextDisplay("Static")
        )
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Display),
                    Expr: new DataExpression("displayField1")
                )
            ]
        };

        var definition2 = new DisplayControlDefinition(
            new TextDisplay("Static")
        )
        {
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Display),
                    Expr: new DataExpression("displayField2")
                )
            ]
        };

        var formStateNode1 = TestHelpers.CreateFormStateNode(
            definition: definition1,
            dataNode: dataNode,
            childKey: "display1",
            childIndex: 0,
            editor: editor
        );

        var formStateNode2 = TestHelpers.CreateFormStateNode(
            definition: definition2,
            dataNode: dataNode,
            childKey: "display2",
            childIndex: 1,
            editor: editor
        );

        var display1 = Assert.IsType<DisplayControlDefinition>(formStateNode1.Definition);
        var text1 = Assert.IsType<TextDisplay>(display1.DisplayData);
        Assert.Equal("Display 1", text1.Text);

        var display2 = Assert.IsType<DisplayControlDefinition>(formStateNode2.Definition);
        var text2 = Assert.IsType<TextDisplay>(display2.DisplayData);
        Assert.Equal("Display 2", text2.Text);

        // Act - change only displayField1
        var childNode1 = dataNode.GetChildForFieldRef("displayField1");
        editor.SetValue(childNode1!.Control, "Updated Display 1");

        // Assert - only formStateNode1 display should update
        display1 = Assert.IsType<DisplayControlDefinition>(formStateNode1.Definition);
        text1 = Assert.IsType<TextDisplay>(display1.DisplayData);
        Assert.Equal("Updated Display 1", text1.Text);

        display2 = Assert.IsType<DisplayControlDefinition>(formStateNode2.Definition);
        text2 = Assert.IsType<TextDisplay>(display2.DisplayData);
        Assert.Equal("Display 2", text2.Text); // Should remain unchanged
    }
}
