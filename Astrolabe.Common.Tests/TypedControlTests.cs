using Astrolabe.Controls;
using Xunit;

namespace Astrolabe.Common.Tests;

public class TypedControlTests
{
    [Fact]
    public void AsTyped_Should_Return_Typed_View_For_String()
    {
        var control = Control.Create("hello");
        var typedControl = control.AsTyped<string>();

        Assert.Equal("hello", typedControl.Value);
        Assert.IsAssignableFrom<ITypedControl<string>>(typedControl);
    }

    [Fact]
    public void AsTyped_Should_Return_Typed_View_For_Int()
    {
        var control = Control.Create(42);
        var typedControl = control.AsTyped<int>();

        Assert.Equal(42, typedControl.Value);
        Assert.IsAssignableFrom<ITypedControl<int>>(typedControl);
    }

    [Fact]
    public void AsTyped_Should_Throw_For_Incompatible_Type()
    {
        var control = Control.Create("hello");

        var ex = Assert.Throws<InvalidCastException>(() => control.AsTyped<int>());
        Assert.Contains("String", ex.Message);
        Assert.Contains("Int32", ex.Message);
    }

    [Fact]
    public void AsTyped_Should_Handle_Null_Value()
    {
        var control = Control.Create(null);
        var typedControl = control.AsTyped<string>();

        Assert.Null(typedControl.Value);
    }

    [Fact]
    public void AsTyped_Should_Handle_Undefined_Value()
    {
        var objControl = Control.Create(new Dictionary<string, object> { ["name"] = "Alice" });
        var missingField = objControl["age"]; // This field doesn't exist, so it's undefined

        // Should not throw - undefined is compatible with any type
        var typedControl = missingField?.AsTyped<int>();
        Assert.NotNull(typedControl);
        Assert.True(typedControl.IsUndefined);
    }

    [Fact]
    public void TypedControl_Should_Expose_All_Properties()
    {
        var control = new Control("current", "initial", ControlFlags.Touched);
        var typedControl = control.AsTyped<string>();

        Assert.Equal("current", typedControl.Value);
        Assert.Equal("initial", typedControl.InitialValue);
        Assert.True(typedControl.IsDirty);
        Assert.True(typedControl.IsTouched);
        Assert.False(typedControl.IsDisabled);
        Assert.True(typedControl.IsValid);
        Assert.Equal(control.UniqueId, typedControl.UniqueId);
    }

    [Fact]
    public void TypedControl_Should_Reflect_Error_State()
    {
        var control = Control.Create("test");
        var typedControl = control.AsTyped<string>();
        var editor = new ControlEditor();

        editor.SetError(control, "validation", "Test error");

        Assert.False(typedControl.IsValid);
        Assert.True(typedControl.HasErrors);
        Assert.Single(typedControl.Errors);
        Assert.Equal("Test error", typedControl.Errors["validation"]);
    }

    [Fact]
    public void TypedControl_Should_Support_Subscriptions()
    {
        var control = Control.Create("initial");
        var typedControl = control.AsTyped<string>();
        var callCount = 0;
        string? capturedValue = null;

        var subscription = typedControl.UnderlyingControl.Subscribe(
            (ctrl, change, editor) =>
            {
                callCount++;
                capturedValue = typedControl.Value; // Access typed value from outer scope
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
    public void TypedControl_Should_Track_Value_Changes()
    {
        var control = Control.Create(10);
        var typedControl = control.AsTyped<int>();
        var editor = new ControlEditor();

        Assert.Equal(10, typedControl.Value);
        Assert.False(typedControl.IsDirty);

        editor.SetValue(control, 20);

        Assert.Equal(20, typedControl.Value);
        Assert.True(typedControl.IsDirty);
    }

    [Fact]
    public void AsTyped_Should_Work_With_Complex_Objects()
    {
        var person = new { Name = "Alice", Age = 30 };
        var control = Control.Create(person);
        var typedControl = control.AsTyped<object>();

        Assert.Equal(person, typedControl.Value);
    }

    [Fact]
    public void AsTyped_Should_Work_For_Nullable_Types()
    {
        var control = Control.Create(42);
        var typedControl = control.AsTyped<int?>();

        Assert.Equal(42, typedControl.Value);
    }

    [Fact]
    public void AsTyped_Should_Accept_Null_For_Nullable_Types()
    {
        var control = Control.Create(null);
        var typedControl = control.AsTyped<int?>();

        Assert.Null(typedControl.Value);
    }

    [Fact]
    public void TypedControl_Should_Share_Same_UniqueId()
    {
        var control = Control.Create("test");
        var typedControl1 = control.AsTyped<string>();
        var typedControl2 = control.AsTyped<string>();

        Assert.Equal(control.UniqueId, typedControl1.UniqueId);
        Assert.Equal(control.UniqueId, typedControl2.UniqueId);
    }

    [Fact]
    public void TypedControl_Subscriptions_Should_Trigger_On_Underlying_Control_Changes()
    {
        var control = Control.Create("initial");
        var typedControl = control.AsTyped<string>();
        var notifications = 0;

        typedControl.UnderlyingControl.Subscribe(
            (ctrl, change, editor) => notifications++,
            ControlChange.Value
        );

        var editor = new ControlEditor();
        editor.SetValue(control, "changed");

        Assert.Equal(1, notifications);
    }

    [Fact]
    public void AsTyped_Should_Work_With_Object_Child_Controls()
    {
        var objControl = Control.Create(
            new Dictionary<string, object> { ["name"] = "Alice", ["age"] = 30 }
        );

        var nameControl = objControl["name"];
        var ageControl = objControl["age"];

        var typedName = nameControl?.AsTyped<string>();
        var typedAge = ageControl?.AsTyped<int>();

        Assert.NotNull(typedName);
        Assert.NotNull(typedAge);
        Assert.Equal("Alice", typedName.Value);
        Assert.Equal(30, typedAge.Value);
    }

    [Fact]
    public void AsTyped_Should_Work_With_Array_Elements()
    {
        var arrayControl = Control.Create(new object[] { "first", 123, "third" });

        var elem0 = arrayControl[0];
        var elem1 = arrayControl[1];

        var typed0 = elem0?.AsTyped<string>();
        var typed1 = elem1?.AsTyped<int>();

        Assert.NotNull(typed0);
        Assert.NotNull(typed1);
        Assert.Equal("first", typed0.Value);
        Assert.Equal(123, typed1.Value);
    }

    [Fact]
    public void AsTyped_Should_Throw_For_Mismatched_Array_Element_Type()
    {
        var arrayControl = Control.Create(new object[] { "string", 123 });
        var elem0 = arrayControl[0];

        // elem0 contains a string, so casting to int should fail
        Assert.Throws<InvalidCastException>(() => elem0?.AsTyped<int>());
    }

    [Fact]
    public void TypedControl_Should_Reflect_InitialValue_Changes()
    {
        var control = Control.Create("initial");
        var typedControl = control.AsTyped<string>();
        var editor = new ControlEditor();

        Assert.Equal("initial", typedControl.InitialValue);

        editor.SetInitialValue(control, "new-initial");

        Assert.Equal("new-initial", typedControl.InitialValue);
    }

    [Fact]
    public void TypedControl_Should_Reflect_Disabled_State()
    {
        var control = Control.Create("test");
        var typedControl = control.AsTyped<string>();
        var editor = new ControlEditor();

        Assert.False(typedControl.IsDisabled);

        editor.SetDisabled(control, true);

        Assert.True(typedControl.IsDisabled);
    }

    [Fact]
    public void TypedControl_Should_Reflect_Touched_State()
    {
        var control = Control.Create("test");
        var typedControl = control.AsTyped<string>();
        var editor = new ControlEditor();

        Assert.False(typedControl.IsTouched);

        editor.SetTouched(control, true);

        Assert.True(typedControl.IsTouched);
    }

    [Fact]
    public void AsTyped_With_Validator_Should_Maintain_Type_Safety()
    {
        var control = Control.Create<string>(
            "test@example.com",
            value => string.IsNullOrEmpty(value) || !value.Contains("@") ? "Invalid email" : null
        );

        var typedControl = control.AsTyped<string>();

        Assert.Equal("test@example.com", typedControl.Value);
        Assert.True(typedControl.IsValid);

        var editor = new ControlEditor();
        editor.SetValue(control, "invalid");
        editor.Validate(control);

        Assert.False(typedControl.IsValid);
        Assert.Contains("Invalid email", typedControl.Errors.Values);
    }
}
