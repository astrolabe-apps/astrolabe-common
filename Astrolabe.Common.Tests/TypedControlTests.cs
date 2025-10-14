using Astrolabe.Controls;
using Xunit;

namespace Astrolabe.Common.Tests;

public class TypedControlTests
{
    [Fact]
    public void Create_Should_Return_Control_For_String()
    {
        var control = Control.Create("hello");

        Assert.Equal("hello", control.Value);
        Assert.IsAssignableFrom<IControl>(control);
    }

    [Fact]
    public void Create_Should_Return_Control_For_Int()
    {
        var control = Control.Create(42);

        Assert.Equal(42, control.Value);
        Assert.IsAssignableFrom<IControl>(control);
    }

    [Fact]
    public void Control_Should_Handle_Null_Value()
    {
        var control = Control.Create(null);

        Assert.Null(control.Value);
    }

    [Fact]
    public void Control_Should_Handle_Undefined_Value()
    {
        var objControl = Control.Create(new Dictionary<string, object> { ["name"] = "Alice" });
        var missingField = objControl["age"]; // This field doesn't exist, so it's undefined

        // Should not throw - undefined is compatible with any type
        Assert.NotNull(missingField);
        Assert.True(missingField!.IsUndefined);
    }

    [Fact]
    public void Control_Should_Expose_All_Properties()
    {
        var control = Control.Create("current", "initial", ControlFlags.Touched);

        Assert.Equal("current", control.Value);
        Assert.Equal("initial", control.InitialValue);
        Assert.True(control.IsDirty);
        Assert.True(control.IsTouched);
        Assert.False(control.IsDisabled);
        Assert.True(control.IsValid);
    }

    [Fact]
    public void Control_Should_Reflect_Error_State()
    {
        var control = Control.Create("test");
        var editor = new ControlEditor();

        editor.SetError(control, "validation", "Test error");

        Assert.False(control.IsValid);
        Assert.True(control.HasErrors);
        Assert.Single(control.Errors);
        Assert.Equal("Test error", control.Errors["validation"]);
    }

    [Fact]
    public void Control_Should_Support_Subscriptions()
    {
        var control = Control.Create("initial");
        var callCount = 0;
        string? capturedValue = null;

        var subscription = control.Subscribe(
            (ctrl, change, editor) =>
            {
                callCount++;
                capturedValue = (string?)ctrl.Value;
            },
            ControlChange.Value
        );

        var controlEditor = new ControlEditor();
        controlEditor.SetValue(control, "changed");

        Assert.Equal(1, callCount);
        Assert.Equal("changed", capturedValue);

        subscription.Dispose();
    }

    [Fact]
    public void Control_Should_Track_Value_Changes()
    {
        var control = Control.Create(10);
        var editor = new ControlEditor();

        Assert.Equal(10, control.Value);
        Assert.False(control.IsDirty);

        editor.SetValue(control, 20);

        Assert.Equal(20, control.Value);
        Assert.True(control.IsDirty);
    }

    [Fact]
    public void Create_Should_Work_With_Complex_Objects()
    {
        var person = new { Name = "Alice", Age = 30 };
        var control = Control.Create(person);

        Assert.Equal(person, control.Value);
    }

    [Fact]
    public void Create_Should_Work_For_Nullable_Types()
    {
        var control = Control.Create(42);

        Assert.Equal(42, control.Value);
    }

    [Fact]
    public void Create_Should_Accept_Null_For_Nullable_Types()
    {
        var control = Control.Create(null);

        Assert.Null(control.Value);
    }

    [Fact]
    public void Control_Subscriptions_Should_Trigger_On_Changes()
    {
        var control = Control.Create("initial");
        var notifications = 0;

        control.Subscribe(
            (ctrl, change, editor) => notifications++,
            ControlChange.Value
        );

        var editor = new ControlEditor();
        editor.SetValue(control, "changed");

        Assert.Equal(1, notifications);
    }

    [Fact]
    public void Control_Should_Work_With_Object_Child_Controls()
    {
        var objControl = Control.Create(
            new Dictionary<string, object> { ["name"] = "Alice", ["age"] = 30 }
        );

        var nameControl = objControl["name"];
        var ageControl = objControl["age"];

        Assert.NotNull(nameControl);
        Assert.NotNull(ageControl);
        Assert.Equal("Alice", nameControl!.Value);
        Assert.Equal(30, ageControl!.Value);
    }

    [Fact]
    public void Control_Should_Work_With_Array_Elements()
    {
        var arrayControl = Control.Create(new object[] { "first", 123, "third" });

        var elem0 = arrayControl[0];
        var elem1 = arrayControl[1];

        Assert.NotNull(elem0);
        Assert.NotNull(elem1);
        Assert.Equal("first", elem0!.Value);
        Assert.Equal(123, elem1!.Value);
    }

    [Fact]
    public void Control_Should_Reflect_InitialValue_Changes()
    {
        var control = Control.Create("initial");
        var editor = new ControlEditor();

        Assert.Equal("initial", control.InitialValue);

        editor.SetInitialValue(control, "new-initial");

        Assert.Equal("new-initial", control.InitialValue);
    }

    [Fact]
    public void Control_Should_Reflect_Disabled_State()
    {
        var control = Control.Create("test");
        var editor = new ControlEditor();

        Assert.False(control.IsDisabled);

        editor.SetDisabled(control, true);

        Assert.True(control.IsDisabled);
    }

    [Fact]
    public void Control_Should_Reflect_Touched_State()
    {
        var control = Control.Create("test");
        var editor = new ControlEditor();

        Assert.False(control.IsTouched);

        editor.SetTouched(control, true);

        Assert.True(control.IsTouched);
    }

    [Fact]
    public void Create_With_Validator_Should_Maintain_Type_Safety()
    {
        var control = Control.Create(
            "test@example.com",
            value => string.IsNullOrEmpty(value) || !value.Contains("@") ? "Invalid email" : null
        );

        Assert.Equal("test@example.com", control.Value);
        Assert.True(control.IsValid);

        var editor = new ControlEditor();
        editor.SetValue(control, "invalid");
        editor.Validate(control);

        Assert.False(control.IsValid);
        Assert.Contains("Invalid email", control.Errors.Values);
    }
}
