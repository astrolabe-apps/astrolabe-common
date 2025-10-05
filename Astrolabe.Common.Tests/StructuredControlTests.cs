using Astrolabe.Controls;
using Xunit;

namespace Astrolabe.Common.Tests;

public class StructuredControlTests
{
    // Test data structures
    public record SimpleData(string Name, int Age);

    public record ComplexData
    {
        public bool? Visible { get; set; }
        public bool Readonly { get; set; }
        public string? Description { get; set; }
        public List<string> Items { get; set; } = new();
    }

    public record NestedData
    {
        public SimpleData? Inner { get; set; }
        public string OuterField { get; set; } = "";
    }

    [Fact]
    public void CreateStructured_Should_Create_Control_With_Child_Fields()
    {
        // Arrange & Act
        var control = Control.CreateStructured(new SimpleData("John", 30));

        // Assert
        Assert.NotNull(control);
        Assert.IsAssignableFrom<IStructuredControl<SimpleData>>(control);

        // Should be able to access underlying control
        var underlyingControl = control.UnderlyingControl;
        Assert.NotNull(underlyingControl);
        Assert.True(underlyingControl.IsObject);

        // Should be able to access fields
        var nameControl = control.Field(x => x.Name);
        var ageControl = control.Field(x => x.Age);
        Assert.NotNull(nameControl);
        Assert.NotNull(ageControl);
    }

    [Fact]
    public void Field_Should_Return_Typed_Control_For_Property()
    {
        // Arrange
        var control = Control.CreateStructured(new SimpleData("John", 30));

        // Act
        var nameControl = control.Field(x => x.Name);
        var ageControl = control.Field(x => x.Age);

        // Assert
        Assert.NotNull(nameControl);
        Assert.NotNull(ageControl);
        Assert.Equal("John", nameControl.Value);
        Assert.Equal(30, ageControl.Value);
    }

    [Fact]
    public void Field_Should_Work_With_Nullable_Properties()
    {
        // Arrange
        var control = Control.CreateStructured(new ComplexData
        {
            Visible = null,
            Readonly = true,
            Description = "test"
        });

        // Act
        var visibleControl = control.Field(x => x.Visible);
        var readonlyControl = control.Field(x => x.Readonly);
        var descriptionControl = control.Field(x => x.Description);

        // Assert
        Assert.Null(visibleControl.Value);
        Assert.True(readonlyControl.Value);
        Assert.Equal("test", descriptionControl.Value);
    }

    [Fact]
    public void Field_Should_Return_Undefined_For_NonExistent_Field()
    {
        // Arrange
        var control = Control.CreateStructured(new SimpleData("John", 30));

        // Act - Access a field that doesn't exist in the dictionary
        var nonExistentControl = control.UnderlyingControl["NonExistentField"];

        // Assert - Should return an undefined control, not null
        Assert.NotNull(nonExistentControl);
        Assert.True(nonExistentControl!.IsUndefined);
    }

    [Fact]
    public void Field_Controls_Should_Be_Mutable_Via_ControlEditor()
    {
        // Arrange
        var control = Control.CreateStructured(new SimpleData("John", 30));
        var editor = new ControlEditor();

        // Act
        var nameControl = control.Field(x => x.Name);
        var ageControl = control.Field(x => x.Age);

        editor.SetValue(nameControl, "Jane");
        editor.SetValue(ageControl, 25);

        // Assert
        Assert.Equal("Jane", nameControl.Value);
        Assert.Equal(25, ageControl.Value);
    }

    [Fact]
    public void Field_Controls_Should_Track_Dirty_State()
    {
        // Arrange
        var control = Control.CreateStructured(new SimpleData("John", 30));
        var editor = new ControlEditor();

        // Act
        var nameControl = control.Field(x => x.Name);

        // Initially not dirty
        Assert.False(nameControl.IsDirty);

        // Modify value
        editor.SetValue(nameControl, "Jane");

        // Should be dirty now
        Assert.True(nameControl.IsDirty);
    }

    [Fact]
    public void Field_Controls_Should_Work_With_ChangeTracker()
    {
        // Arrange
        var control = Control.CreateStructured(new SimpleData("John", 30));
        var tracker = new ChangeTracker();
        var editor = new ControlEditor();
        var callbackCount = 0;

        // Setup tracker
        tracker.SetCallback(() => callbackCount++);

        // Act - Track name field access
        var tracked = tracker.Tracked(control.Field(x => x.Name));
        _ = tracked.Value; // Access value to create dependency
        tracker.UpdateSubscriptions();

        // Modify the name field
        var nameControl = control.Field(x => x.Name);
        editor.SetValue(nameControl, "Jane");

        // Assert
        Assert.Equal(1, callbackCount);
    }

    [Fact]
    public void Multiple_Field_Accesses_Should_Return_Same_Control()
    {
        // Arrange
        var control = Control.CreateStructured(new SimpleData("John", 30));

        // Act
        var nameControl1 = control.Field(x => x.Name);
        var nameControl2 = control.Field(x => x.Name);

        // Assert - Should return the same underlying control
        Assert.Equal(nameControl1.UniqueId, nameControl2.UniqueId);
    }

    [Fact]
    public void Field_Controls_Should_Support_Validation()
    {
        // Arrange
        var control = Control.CreateStructured(new SimpleData("", 30));
        var editor = new ControlEditor();

        // Act
        var nameControl = control.Field(x => x.Name);

        // Set error
        editor.SetError(nameControl, "required", "Name is required");

        // Assert
        Assert.True(nameControl.HasErrors);
        Assert.False(nameControl.IsValid);
        Assert.Equal("Name is required", nameControl.Errors["required"]);
    }

    [Fact]
    public void Field_Controls_Should_Support_Collections()
    {
        // Arrange
        var control = Control.CreateStructured(new ComplexData
        {
            Items = new List<string> { "a", "b", "c" }
        });

        // Act
        var itemsControl = control.Field(x => x.Items);

        // Assert
        Assert.NotNull(itemsControl);
        var value = itemsControl.Value;
        Assert.IsType<List<string>>(value);
        Assert.Equal(3, ((List<string>)value!).Count);
    }

    [Fact]
    public void CreateStructured_Should_Handle_Null_Properties()
    {
        // Arrange & Act
        var control = Control.CreateStructured(new ComplexData
        {
            Visible = null,
            Readonly = false,
            Description = null
        });

        // Act
        var visibleControl = control.Field(x => x.Visible);
        var descriptionControl = control.Field(x => x.Description);

        // Assert
        Assert.Null(visibleControl.Value);
        Assert.Null(descriptionControl.Value);
    }

    [Fact]
    public void Field_Access_Should_Work_With_Property_Syntax()
    {
        // Arrange
        var control = Control.CreateStructured(new ComplexData
        {
            Visible = true,
            Readonly = false
        });

        // Act - Different property access styles
        var visible1 = control.Field(x => x.Visible);
        var visible2 = control.Field(data => data.Visible);

        // Assert - Should both work
        Assert.Equal(visible1.UniqueId, visible2.UniqueId);
        Assert.True(visible1.Value);
    }

    [Fact]
    public void Structured_Control_Should_Work_With_ChangeTracker_For_Multiple_Fields()
    {
        // Arrange
        var control = Control.CreateStructured(new ComplexData
        {
            Visible = true,
            Readonly = false,
            Description = "test"
        });

        var tracker = new ChangeTracker();
        var editor = new ControlEditor();
        var callbackCount = 0;

        tracker.SetCallback(() => callbackCount++);

        // Act - Track multiple fields
        var trackedVisible = tracker.Tracked(control.Field(x => x.Visible));
        var trackedReadonly = tracker.Tracked(control.Field(x => x.Readonly));
        _ = trackedVisible.Value;
        _ = trackedReadonly.Value;
        tracker.UpdateSubscriptions();

        // Modify visible
        editor.SetValue(control.Field(x => x.Visible), false);
        Assert.Equal(1, callbackCount);

        // Modify readonly
        editor.SetValue(control.Field(x => x.Readonly), true);
        Assert.Equal(2, callbackCount);

        // Modify untracked field - should not trigger
        editor.SetValue(control.Field(x => x.Description), "changed");
        Assert.Equal(2, callbackCount); // Still 2
    }

    [Fact]
    public void Field_Controls_Should_Support_Touch_State()
    {
        // Arrange
        var control = Control.CreateStructured(new SimpleData("John", 30));
        var editor = new ControlEditor();
        var nameControl = control.Field(x => x.Name);

        // Act & Assert
        Assert.False(nameControl.IsTouched);

        editor.SetTouched(nameControl, true);
        Assert.True(nameControl.IsTouched);

        editor.SetTouched(nameControl, false);
        Assert.False(nameControl.IsTouched);
    }

    [Fact]
    public void Field_Controls_Should_Support_Disabled_State()
    {
        // Arrange
        var control = Control.CreateStructured(new SimpleData("John", 30));
        var editor = new ControlEditor();
        var nameControl = control.Field(x => x.Name);

        // Act & Assert
        Assert.False(nameControl.IsDisabled);

        editor.SetDisabled(nameControl, true);
        Assert.True(nameControl.IsDisabled);

        editor.SetDisabled(nameControl, false);
        Assert.False(nameControl.IsDisabled);
    }

    [Fact]
    public void CreateStructured_With_DontClearError_Should_Preserve_Errors()
    {
        // Arrange
        var control = Control.CreateStructured(
            new SimpleData("John", 30),
            dontClearError: true
        );
        var editor = new ControlEditor();
        var nameControl = control.Field(x => x.Name);

        // Act
        editor.SetError(nameControl, "test", "Error message");
        editor.SetValue(nameControl, "Jane");

        // Assert - Error should still be there
        Assert.True(nameControl.HasErrors);
    }

    [Fact]
    public void Structured_Control_Reactive_Computation_Example()
    {
        // This test demonstrates a reactive computation pattern
        // similar to what will be used in FormStateNode

        // Arrange
        var control = Control.CreateStructured(new ComplexData
        {
            Visible = null,
            Readonly = false
        });

        var tracker = new ChangeTracker();
        var editor = new ControlEditor();
        var computedValue = false;

        // Setup reactive computation
        tracker.SetCallback(() =>
        {
            // Read visible through tracker
            var tracked = tracker.Tracked(control.Field(x => x.Visible));
            var visible = tracked.Value;

            // Compute derived value
            computedValue = visible == true;

            // Update subscriptions
            tracker.UpdateSubscriptions();
        });

        // Initial computation
        var trackedInitial = tracker.Tracked(control.Field(x => x.Visible));
        _ = trackedInitial.Value;
        tracker.UpdateSubscriptions();

        // Act - Change visible
        editor.SetValue(control.Field(x => x.Visible), true);

        // Assert - Callback should have fired and updated computedValue
        Assert.True(computedValue);

        // Act - Change visible again
        editor.SetValue(control.Field(x => x.Visible), false);

        // Assert
        Assert.False(computedValue);
    }
}
