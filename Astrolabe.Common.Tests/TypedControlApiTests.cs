using Astrolabe.Controls;
using Xunit;

namespace Astrolabe.Common.Tests;

public class TypedControlApiTests
{
    [Fact]
    public void Create_Should_Return_Control()
    {
        var control = Control.Create("initial");

        Assert.Equal("initial", control.Value);
        Assert.IsAssignableFrom<IControl>(control);
    }

    [Fact]
    public void SetValue_Should_Work()
    {
        var control = Control.Create(42);
        var editor = new ControlEditor();

        editor.SetValue(control, 100);

        Assert.Equal(100, control.Value);
    }

    [Fact]
    public void SetInitialValue_Should_Work()
    {
        var control = Control.Create("current");
        var editor = new ControlEditor();

        editor.SetInitialValue(control, "initial");

        Assert.Equal("initial", control.InitialValue);
        Assert.True(control.IsDirty);
    }

    [Fact]
    public void SetDisabled_Should_Work()
    {
        var control = Control.Create(true);
        var editor = new ControlEditor();

        editor.SetDisabled(control, true);

        Assert.True(control.IsDisabled);
    }

    [Fact]
    public void SetTouched_Should_Work()
    {
        var control = Control.Create(3.14);
        var editor = new ControlEditor();

        editor.SetTouched(control, true);

        Assert.True(control.IsTouched);
    }

    [Fact]
    public void MarkAsClean_Should_Work()
    {
        var control = Control.Create("initial");
        var editor = new ControlEditor();

        editor.SetValue(control, "changed");
        Assert.True(control.IsDirty);

        editor.MarkAsClean(control);
        Assert.False(control.IsDirty);
        Assert.Equal("changed", control.InitialValue);
    }

    [Fact]
    public void SetError_Should_Work()
    {
        var control = Control.Create("test");
        var editor = new ControlEditor();

        editor.SetError(control, "validation", "Invalid value");

        Assert.False(control.IsValid);
        Assert.True(control.HasErrors);
        Assert.Equal("Invalid value", control.Errors["validation"]);
    }

    [Fact]
    public void ClearErrors_Should_Work()
    {
        var control = Control.Create("test");
        var editor = new ControlEditor();

        editor.SetError(control, "validation", "Invalid");
        Assert.False(control.IsValid);

        editor.ClearErrors(control);
        Assert.True(control.IsValid);
        Assert.False(control.HasErrors);
    }

    [Fact]
    public void Validate_Should_Work()
    {
        var control = Control.Create<string>("initial", value =>
            string.IsNullOrEmpty(value) ? "Required" : null);

        var editor = new ControlEditor();

        editor.SetValue(control, "");
        var isValid = editor.Validate(control);

        Assert.False(isValid);
        Assert.False(control.IsValid);
    }

    [Fact]
    public void Control_Works_With_ChangeTracker()
    {
        var control = Control.Create(10);
        var tracker = new ChangeTracker();
        var callbackCount = 0;

        tracker.SetCallback(() => callbackCount++);

        tracker.RecordAccess(control, ControlChange.Value);
        _ = control.Value;
        tracker.UpdateSubscriptions();

        var editor = new ControlEditor();
        editor.SetValue(control, 20);

        Assert.Equal(1, callbackCount);
    }
}
