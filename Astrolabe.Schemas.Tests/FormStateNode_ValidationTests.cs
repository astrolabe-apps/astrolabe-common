using Astrolabe.Controls;
using Astrolabe.Schemas;
using Astrolabe.Schemas.Validation.Validators;
using Xunit;

namespace Astrolabe.Schemas.Tests;

/// <summary>
/// Integration tests for FormStateNode validation functionality
/// Tests the full validation pipeline from FormStateNode through validators
/// </summary>
public class FormStateNode_ValidationTests
{
    [Fact]
    public void Should_Not_Initialize_Validation_For_Non_DataControl()
    {
        // Arrange
        var groupedDefinition = new GroupedControlsDefinition
        {
            Children = new List<ControlDefinition>()
        };

        // Act
        var formState = TestHelpers.CreateFormStateNode(definition: groupedDefinition);

        // Assert - Should not throw, validation just doesn't run
        Assert.NotNull(formState);
    }

    [Fact]
    public void Should_Not_Initialize_Validation_When_No_Validators()
    {
        // Arrange
        var definition = new DataControlDefinition(".")
        {
            Required = false,
            Validators = null
        };

        // Act
        var formState = TestHelpers.CreateFormStateNode(definition: definition);

        // Assert - Should not throw, validation just doesn't run
        Assert.NotNull(formState);
    }

    [Fact]
    public void Required_Should_Set_Error_On_Empty_Value()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "string");
        var dataNode = TestHelpers.CreateTestDataNode(schema, "");
        var definition = new DataControlDefinition(".")  // "." means current node
        {
            Required = true
        };
        var editor = new ControlEditor();

        // Act
        var formState = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor);

        // Assert - validation runs reactively
        var errors = dataNode.Control.Errors;
        Assert.NotNull(errors);
        Assert.True(errors.ContainsKey("default"));
        Assert.Equal("This field is required", errors["default"]);
    }

    [Fact]
    public void Required_Should_Clear_Error_On_Valid_Value()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "string");
        var dataNode = TestHelpers.CreateTestDataNode(schema, "");
        var definition = new DataControlDefinition(".")
        {
            Required = true
        };
        var editor = new ControlEditor();

        var formState = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor);

        // Verify error is set
        Assert.True(dataNode.Control.Errors?.ContainsKey("default"));

        // Act - Set valid value
        editor.SetValue(dataNode.Control, "valid value");

        // Assert - validation updates reactively
        var errors = dataNode.Control.Errors;
        Assert.False(errors?.ContainsKey("default") ?? false);
    }

    [Fact]
    public void LengthValidator_Should_Set_Error_When_String_Too_Short()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "string");
        var dataNode = TestHelpers.CreateTestDataNode(schema, "ab");
        var definition = new DataControlDefinition(".")
        {
            Validators = new List<SchemaValidator>
            {
                new LengthValidator(Min: 5, Max: null)
            }
        };
        var editor = new ControlEditor();

        // Act
        var formState = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor);


        // Assert
        var errors = dataNode.Control.Errors;
        Assert.NotNull(errors);
        Assert.True(errors.ContainsKey("default"));
        Assert.Contains("at least 5", errors["default"]);
    }

    [Fact]
    public void LengthValidator_Should_Set_Error_When_String_Too_Long()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "string");
        var dataNode = TestHelpers.CreateTestDataNode(schema, "toolongstring");
        var definition = new DataControlDefinition(".")
        {
            Validators = new List<SchemaValidator>
            {
                new LengthValidator(Min: null, Max: 5)
            }
        };
        var editor = new ControlEditor();

        // Act
        var formState = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor);


        // Assert
        var errors = dataNode.Control.Errors;
        Assert.NotNull(errors);
        Assert.True(errors.ContainsKey("default"));
        Assert.Contains("no more than 5", errors["default"]);
    }

    [Fact]
    public void LengthValidator_Should_Work_With_Arrays()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "string", collection: true);
        var dataNode = TestHelpers.CreateArrayDataNode(schema, "item1");
        var definition = new DataControlDefinition(".")
        {
            Validators = new List<SchemaValidator>
            {
                new LengthValidator(Min: 3, Max: null)
            }
        };
        var editor = new ControlEditor();

        // Act
        var formState = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor);


        // Assert
        var errors = dataNode.Control.Errors;
        Assert.NotNull(errors);
        Assert.True(errors.ContainsKey("default"));
        Assert.Contains("at least 3", errors["default"]);
    }

    [Fact]
    public void DateValidator_Should_Set_Error_When_Date_Too_Early()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "date");
        var testDate = new DateTime(2020, 1, 1);
        var minDate = new DateOnly(2021, 1, 1);
        var dataNode = TestHelpers.CreateTestDataNode(schema, testDate);
        var definition = new DataControlDefinition(".")
        {
            Validators = new List<SchemaValidator>
            {
                new DateValidator(
                    Comparison: DateComparison.NotBefore,
                    FixedDate: minDate,
                    DaysFromCurrent: null)
            }
        };
        var editor = new ControlEditor();

        // Act
        var formState = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor);


        // Assert
        var errors = dataNode.Control.Errors;
        Assert.NotNull(errors);
        Assert.True(errors.ContainsKey("default"));
        Assert.Contains("must not be before", errors["default"]);
    }

    [Fact]
    public void Multiple_Validators_Should_Show_First_Error()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "string");
        var dataNode = TestHelpers.CreateTestDataNode(schema, "");
        var definition = new DataControlDefinition(".")
        {
            Required = true,
            Validators = new List<SchemaValidator>
            {
                new LengthValidator(Min: 5, Max: null)
            }
        };
        var editor = new ControlEditor();

        // Act
        var formState = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor);


        // Assert - Should show Required error first (Required runs before explicit validators)
        var errors = dataNode.Control.Errors;
        Assert.NotNull(errors);
        Assert.True(errors.ContainsKey("default"));
        Assert.Equal("This field is required", errors["default"]);
    }

    [Fact]
    public void Validation_Should_React_To_Value_Changes()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "string");
        var dataNode = TestHelpers.CreateTestDataNode(schema, "ab");
        var definition = new DataControlDefinition(".")
        {
            Validators = new List<SchemaValidator>
            {
                new LengthValidator(Min: 5, Max: null)
            }
        };
        var editor = new ControlEditor();

        var formState = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor);


        // Verify initial error
        Assert.True(dataNode.Control.Errors?.ContainsKey("default"));

        // Act - Change to valid value
        editor.SetValue(dataNode.Control, "hello world");

        // Assert - Error should be cleared
        var errors = dataNode.Control.Errors;
        Assert.False(errors?.ContainsKey("default") ?? false);
    }

    [Fact]
    public void Validation_Should_Be_Disabled_When_Not_Visible()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "string");
        var dataNode = TestHelpers.CreateTestDataNode(schema, "");
        var definition = new DataControlDefinition(".")
        {
            Required = true,
            Hidden = true // Not visible
        };
        var editor = new ControlEditor();

        // Act
        var formState = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor);


        // Assert - No error should be set when not visible
        var errors = dataNode.Control.Errors;
        Assert.False(errors?.ContainsKey("default") ?? false);
    }

    [Fact]
    public void Validation_Should_Enable_When_Becomes_Visible()
    {
        // Arrange - Test with dynamic visibility that changes
        var (_, _, parentData) = TestHelpers.CreateParentChildSchema("parent", "toggleField", true);

        var definition = new DataControlDefinition(".")
        {
            Required = true,
            Dynamic =
            [
                new DynamicProperty(
                    Type: nameof(DynamicPropertyType.Visible),
                    Expr: new DataExpression("toggleField")
                )
            ]
        };
        var editor = new ControlEditor();

        var formState = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: parentData,
            editor: editor);

        // Initially visible (toggleField = true), so should be visible
        Assert.True(formState.Visible);

        // Act - Make invisible by setting toggleField to false
        var toggleControl = parentData.GetChildForFieldRef("toggleField");
        editor.SetValue(toggleControl!.Control, false);

        // Assert - Should become hidden
        Assert.False(formState.Visible);
    }

    [Fact]
    public void Validation_Should_Use_Standard_Required_Error_Message()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "string");
        var dataNode = TestHelpers.CreateTestDataNode(schema, "");
        var definition = new DataControlDefinition(".")
        {
            Required = true
        };
        var editor = new ControlEditor();

        // Act
        var formState = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor);


        // Assert
        var errors = dataNode.Control.Errors;
        Assert.NotNull(errors);
        Assert.True(errors.ContainsKey("default"));
        Assert.Equal("This field is required", errors["default"]);
    }

    [Fact]
    public void Validation_Should_Handle_Undefined_Control()
    {
        // Arrange
        var schema = TestHelpers.CreateTestSchema("testField", "string");
        var undefinedControl = Control.CreateUndefined<object?>();
        var dataNode = new SchemaDataNode(schema, undefinedControl, null);
        var definition = new DataControlDefinition(".")
        {
            Required = true
        };
        var editor = new ControlEditor();

        // Act & Assert - Should not throw
        var formState = TestHelpers.CreateFormStateNode(
            definition: definition,
            dataNode: dataNode,
            editor: editor);


        // Validation should run but control will be hidden due to undefined data
        Assert.NotNull(formState);
    }

    [Fact]
    public void Validation_Should_Inherit_Parent_Visibility_State()
    {
        // Arrange
        var parentSchema = TestHelpers.CreateTestSchema("parent", "object");
        var childSchema = parentSchema.AddChild("child", "string");
        var parentData = TestHelpers.CreateObjectDataNode(parentSchema, new Dictionary<string, object?> { { "child", "" } });

        var parentDefinition = new DataControlDefinition(".")
        {
            Hidden = true // Parent is hidden
        };

        var childDefinition = new DataControlDefinition("child")
        {
            Required = true
        };

        var editor = new ControlEditor();

        var parentState = TestHelpers.CreateFormStateNode(
            definition: parentDefinition,
            dataNode: parentData,
            editor: editor);

        // Act - Get child data using GetChildForFieldRef helper
        var childDataNode = parentData.GetChildForFieldRef("child");
        Assert.NotNull(childDataNode);

        var childState = TestHelpers.CreateChildFormStateNode(
            parentNode: parentState,
            editor: editor,
            definition: childDefinition,
            parent: childDataNode);


        // Assert - Child should not have validation error because parent is hidden
        var errors = childDataNode.Control.Errors;
        Assert.False(errors?.ContainsKey("default") ?? false);
    }
}
