using Astrolabe.Controls;
using Xunit;

namespace Astrolabe.Common.Tests;

public class TypedControlApiTests
{
    [Fact]
    public void CreateTyped_Should_Return_Typed_Control()
    {
        var control = Control.CreateTyped<string>("initial");

        Assert.Equal("initial", control.Value);
        Assert.IsAssignableFrom<ITypedControl<string>>(control);
    }

    [Fact]
    public void SetValue_With_Typed_Control_Should_Work()
    {
        var control = Control.CreateTyped<int>(42);
        var editor = new ControlEditor();

        editor.SetValue(control, 100);

        Assert.Equal(100, control.Value);
    }

    [Fact]
    public void SetInitialValue_With_Typed_Control_Should_Work()
    {
        var control = Control.CreateTyped<string>("current");
        var editor = new ControlEditor();

        editor.SetInitialValue(control, "initial");

        Assert.Equal("initial", control.InitialValue);
        Assert.True(control.IsDirty);
    }

    [Fact]
    public void SetDisabled_With_Typed_Control_Should_Work()
    {
        var control = Control.CreateTyped<bool>(true);
        var editor = new ControlEditor();

        editor.SetDisabled(control, true);

        Assert.True(control.IsDisabled);
    }

    [Fact]
    public void SetTouched_With_Typed_Control_Should_Work()
    {
        var control = Control.CreateTyped<double>(3.14);
        var editor = new ControlEditor();

        editor.SetTouched(control, true);

        Assert.True(control.IsTouched);
    }

    [Fact]
    public void MarkAsClean_With_Typed_Control_Should_Work()
    {
        var control = Control.CreateTyped<string>("initial");
        var editor = new ControlEditor();

        editor.SetValue(control, "changed");
        Assert.True(control.IsDirty);

        editor.MarkAsClean(control);
        Assert.False(control.IsDirty);
        Assert.Equal("changed", control.InitialValue);
    }

    [Fact]
    public void SetError_With_Typed_Control_Should_Work()
    {
        var control = Control.CreateTyped<string>("test");
        var editor = new ControlEditor();

        editor.SetError(control, "validation", "Invalid value");

        Assert.False(control.IsValid);
        Assert.True(control.HasErrors);
        Assert.Equal("Invalid value", control.Errors["validation"]);
    }

    [Fact]
    public void ClearErrors_With_Typed_Control_Should_Work()
    {
        var control = Control.CreateTyped<string>("test");
        var editor = new ControlEditor();

        editor.SetError(control, "validation", "Invalid");
        Assert.False(control.IsValid);

        editor.ClearErrors(control);
        Assert.True(control.IsValid);
        Assert.False(control.HasErrors);
    }

    [Fact]
    public void Validate_With_Typed_Control_Should_Work()
    {
        var control = Control.Create<string>("initial", value =>
            string.IsNullOrEmpty(value) ? "Required" : null);

        var typedControl = control.AsTyped<string>();
        var editor = new ControlEditor();

        editor.SetValue(typedControl, "");
        var isValid = editor.Validate(typedControl);

        Assert.False(isValid);
        Assert.False(typedControl.IsValid);
    }

    [Fact]
    public void Typed_API_Works_With_ChangeTracker()
    {
        var control = Control.CreateTyped<int>(10);
        var tracker = new ChangeTracker();
        var callbackCount = 0;

        tracker.SetCallback(() => callbackCount++);

        var tracked = tracker.Tracked(control);
        _ = tracked.Value;
        tracker.UpdateSubscriptions();

        var editor = new ControlEditor();
        editor.SetValue(control, 20);

        Assert.Equal(1, callbackCount);
    }
}
