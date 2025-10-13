using Astrolabe.Common;
using Astrolabe.Schemas;
using Xunit;

namespace Astrolabe.Common.Tests;

public class CloneWithOverridesTests
{
    [Fact]
    public void CloneWithOverrides_Should_Clone_DataControlDefinition_With_Field_Override()
    {
        var original = new DataControlDefinition("originalField")
        {
            Title = "Original Title",
            Required = true,
            HideTitle = false
        };

        var overrides = new Dictionary<string, object?>
        {
            ["Field"] = "newField",
            ["Title"] = "New Title"
        };

        var cloned = RecordExtensions.CloneWithOverrides(original, overrides);

        // Verify it's a new instance
        Assert.NotSame(original, cloned);

        // Verify overridden properties
        Assert.Equal("newField", cloned.Field);
        Assert.Equal("New Title", cloned.Title);

        // Verify non-overridden properties remain the same
        Assert.Equal(original.Required, cloned.Required);
        Assert.Equal(original.HideTitle, cloned.HideTitle);
        Assert.Equal(original.Type, cloned.Type);
    }

    [Fact]
    public void CloneWithOverrides_Should_Clone_GroupedControlsDefinition_With_Multiple_Overrides()
    {
        var original = new GroupedControlsDefinition
        {
            Title = "Original Group",
            CompoundField = "original.field",
            Disabled = false,
            Hidden = false
        };

        var overrides = new Dictionary<string, object?>
        {
            ["Title"] = "New Group Title",
            ["CompoundField"] = "new.compound.field",
            ["Disabled"] = true
        };

        var cloned = RecordExtensions.CloneWithOverrides(original, overrides);

        Assert.NotSame(original, cloned);
        Assert.Equal("New Group Title", cloned.Title);
        Assert.Equal("new.compound.field", cloned.CompoundField);
        Assert.True(cloned.Disabled);
        Assert.Equal(original.Hidden, cloned.Hidden);
        Assert.Equal(original.Type, cloned.Type);
    }

    [Fact]
    public void CloneWithOverrides_Should_Clone_ActionControlDefinition_With_Complex_Properties()
    {
        var originalIcon = new IconReference("Material", "home");
        var original = new ActionControlDefinition(
            "saveAction",
            "save-data",
            originalIcon,
            ActionStyle.Button,
            IconPlacement.BeforeText,
            ControlDisableType.Self
        )
        {
            Title = "Save",
            StyleClass = "btn-primary"
        };

        var newIcon = new IconReference("FontAwesome", "save");
        var overrides = new Dictionary<string, object?>
        {
            ["ActionId"] = "updateAction",
            ["Icon"] = newIcon,
            ["Title"] = "Update",
            ["ActionStyle"] = ActionStyle.Secondary
        };

        var cloned = RecordExtensions.CloneWithOverrides(original, overrides);

        Assert.NotSame(original, cloned);
        Assert.Equal("updateAction", cloned.ActionId);
        Assert.Equal(newIcon, cloned.Icon);
        Assert.Equal("Update", cloned.Title);
        Assert.Equal(ActionStyle.Secondary, cloned.ActionStyle);

        // Verify non-overridden properties
        Assert.Equal(original.ActionData, cloned.ActionData);
        Assert.Equal(original.IconPlacement, cloned.IconPlacement);
        Assert.Equal(original.DisableType, cloned.DisableType);
        Assert.Equal(original.StyleClass, cloned.StyleClass);
    }

    [Fact]
    public void CloneWithOverrides_Should_Handle_Null_Values()
    {
        var original = new DataControlDefinition("field1")
        {
            Title = "Original",
            Required = true,
            DefaultValue = "default"
        };

        var overrides = new Dictionary<string, object?>
        {
            ["Title"] = null,
            ["DefaultValue"] = null
        };

        var cloned = RecordExtensions.CloneWithOverrides(original, overrides);

        Assert.NotSame(original, cloned);
        Assert.Null(cloned.Title);
        Assert.Null(cloned.DefaultValue);
        Assert.Equal(original.Required, cloned.Required);
        Assert.Equal(original.Field, cloned.Field);
    }

    [Fact]
    public void CloneWithOverrides_Should_Be_Case_Insensitive_For_Property_Names()
    {
        var original = new DataControlDefinition("originalField")
        {
            Title = "Original Title",
            Required = true
        };

        var overrides = new Dictionary<string, object?>
        {
            ["field"] = "newField", // lowercase
            ["TITLE"] = "New Title", // uppercase
            ["required"] = false // lowercase
        };

        var cloned = RecordExtensions.CloneWithOverrides(original, overrides);

        Assert.NotSame(original, cloned);
        Assert.Equal("newField", cloned.Field);
        Assert.Equal("New Title", cloned.Title);
        Assert.False(cloned.Required);
    }

    [Fact]
    public void CloneWithOverrides_Should_Ignore_Unknown_Properties()
    {
        var original = new DataControlDefinition("field1")
        {
            Title = "Original"
        };

        var overrides = new Dictionary<string, object?>
        {
            ["Title"] = "New Title",
            ["NonExistentProperty"] = "should be ignored",
            ["AnotherBadProperty"] = 123
        };

        var cloned = RecordExtensions.CloneWithOverrides(original, overrides);

        Assert.NotSame(original, cloned);
        Assert.Equal("New Title", cloned.Title);
        Assert.Equal(original.Field, cloned.Field);
    }

    [Fact]
    public void CloneWithOverrides_Should_Clone_DisplayControlDefinition()
    {
        var originalDisplay = new TextDisplay("Original Text");
        var original = new DisplayControlDefinition(originalDisplay)
        {
            Title = "Display Title",
            StyleClass = "display-class"
        };

        var newDisplay = new TextDisplay("New Text");
        var overrides = new Dictionary<string, object?>
        {
            ["DisplayData"] = newDisplay,
            ["StyleClass"] = "new-class"
        };

        var cloned = RecordExtensions.CloneWithOverrides(original, overrides);

        Assert.NotSame(original, cloned);
        Assert.Equal(newDisplay, cloned.DisplayData);
        Assert.Equal("new-class", cloned.StyleClass);
        Assert.Equal(original.Title, cloned.Title);
    }

    [Fact]
    public void CloneWithOverrides_Should_Handle_Empty_Overrides()
    {
        var original = new DataControlDefinition("field1")
        {
            Title = "Original",
            Required = true
        };

        var overrides = new Dictionary<string, object?>();

        var cloned = RecordExtensions.CloneWithOverrides(original, overrides);

        Assert.NotSame(original, cloned);
        Assert.Equal(original.Field, cloned.Field);
        Assert.Equal(original.Title, cloned.Title);
        Assert.Equal(original.Required, cloned.Required);
    }

    [Fact]
    public void CloneWithOverrides_Should_Clone_Nested_Complex_Types()
    {
        var originalRenderOptions = new TextfieldRenderOptions("Original Placeholder", false);
        var original = new DataControlDefinition("field1")
        {
            Title = "Original",
            RenderOptions = originalRenderOptions,
            Required = true
        };

        var newRenderOptions = new TextfieldRenderOptions("New Placeholder", true);
        var overrides = new Dictionary<string, object?>
        {
            ["RenderOptions"] = newRenderOptions,
            ["Required"] = false
        };

        var cloned = RecordExtensions.CloneWithOverrides(original, overrides);

        Assert.NotSame(original, cloned);
        Assert.Equal(newRenderOptions, cloned.RenderOptions);
        Assert.False(cloned.Required);
        Assert.Equal(original.Field, cloned.Field);
        Assert.Equal(original.Title, cloned.Title);
    }

    [Fact]
    public void CloneWithOverrides_Should_Throw_On_Null_Original()
    {
        DataControlDefinition? original = null;
        var overrides = new Dictionary<string, object?> { ["Field"] = "test" };

        Assert.Throws<ArgumentNullException>(() => RecordExtensions.CloneWithOverrides(original!, overrides));
    }

    [Fact]
    public void CloneWithOverrides_Should_Throw_On_Null_Overrides()
    {
        var original = new DataControlDefinition("field1");

        Assert.Throws<ArgumentNullException>(() => RecordExtensions.CloneWithOverrides(original, null!));
    }

    [Fact]
    public void CloneWithOverrides_Should_Work_With_All_ControlDefinition_Properties()
    {
        var original = new DataControlDefinition("originalField")
        {
            Title = "Original Title",
            Id = "original-id",
            ChildRefId = "original-ref",
            Disabled = false,
            Hidden = false,
            Readonly = false,
            StyleClass = "original-style",
            TextClass = "original-text",
            LayoutClass = "original-layout",
            LabelClass = "original-label",
            LabelTextClass = "original-label-text",
            Placement = "top"
        };

        var overrides = new Dictionary<string, object?>
        {
            ["Title"] = "New Title",
            ["Id"] = "new-id",
            ["Disabled"] = true,
            ["Hidden"] = true,
            ["StyleClass"] = "new-style",
            ["Placement"] = "bottom"
        };

        var cloned = RecordExtensions.CloneWithOverrides(original, overrides);

        Assert.NotSame(original, cloned);
        Assert.Equal("New Title", cloned.Title);
        Assert.Equal("new-id", cloned.Id);
        Assert.True(cloned.Disabled);
        Assert.True(cloned.Hidden);
        Assert.Equal("new-style", cloned.StyleClass);
        Assert.Equal("bottom", cloned.Placement);

        // Non-overridden properties
        Assert.Equal(original.Field, cloned.Field);
        Assert.Equal(original.ChildRefId, cloned.ChildRefId);
        Assert.Equal(original.Readonly, cloned.Readonly);
        Assert.Equal(original.TextClass, cloned.TextClass);
        Assert.Equal(original.LayoutClass, cloned.LayoutClass);
        Assert.Equal(original.LabelClass, cloned.LabelClass);
        Assert.Equal(original.LabelTextClass, cloned.LabelTextClass);
    }

    [Fact]
    public void CloneWithOverrides_Should_Work_With_Collections()
    {
        var originalValidators = new List<SchemaValidator>
        {
            new LengthValidator(5, null)
        };

        var original = new DataControlDefinition("field1")
        {
            Title = "Original",
            Validators = originalValidators
        };

        var newValidators = new List<SchemaValidator>
        {
            new LengthValidator(5, null),
            new LengthValidator(null, 100)
        };

        var overrides = new Dictionary<string, object?>
        {
            ["Validators"] = newValidators,
            ["Title"] = "Updated"
        };

        var cloned = RecordExtensions.CloneWithOverrides(original, overrides);

        Assert.NotSame(original, cloned);
        Assert.Equal(newValidators, cloned.Validators);
        Assert.Equal("Updated", cloned.Title);
        Assert.Equal(original.Field, cloned.Field);
    }

    [Fact]
    public void CloneWithOverrides_Should_Handle_Extensions_Dictionary()
    {
        var originalExtensions = new Dictionary<string, object?>
        {
            ["customProp1"] = "value1",
            ["customProp2"] = 42
        };

        var original = new DataControlDefinition("field1")
        {
            Title = "Original",
            Extensions = originalExtensions
        };

        var newExtensions = new Dictionary<string, object?>
        {
            ["customProp1"] = "newValue1",
            ["customProp3"] = true
        };

        var overrides = new Dictionary<string, object?>
        {
            ["Extensions"] = newExtensions
        };

        var cloned = RecordExtensions.CloneWithOverrides(original, overrides);

        Assert.NotSame(original, cloned);
        Assert.Equal(newExtensions, cloned.Extensions);
        Assert.NotEqual(originalExtensions, cloned.Extensions);
        Assert.Equal(original.Field, cloned.Field);
        Assert.Equal(original.Title, cloned.Title);
    }

    [Fact]
    public void CloneWithOverrides_Multiple_Times_Should_Create_Independent_Instances()
    {
        var original = new DataControlDefinition("field1")
        {
            Title = "Original",
            Required = false
        };

        var overrides1 = new Dictionary<string, object?>
        {
            ["Title"] = "Clone 1"
        };

        var overrides2 = new Dictionary<string, object?>
        {
            ["Title"] = "Clone 2",
            ["Required"] = true
        };

        var clone1 = RecordExtensions.CloneWithOverrides(original, overrides1);
        var clone2 = RecordExtensions.CloneWithOverrides(original, overrides2);

        Assert.NotSame(original, clone1);
        Assert.NotSame(original, clone2);
        Assert.NotSame(clone1, clone2);

        Assert.Equal("Original", original.Title);
        Assert.Equal("Clone 1", clone1.Title);
        Assert.Equal("Clone 2", clone2.Title);

        Assert.False(original.Required);
        Assert.False(clone1.Required);
        Assert.True(clone2.Required);
    }
}