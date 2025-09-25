using Astrolabe.Controls;
using Xunit;

namespace Astrolabe.Common.Tests;

public class ControlTests
{
    [Fact]
    public void Control_Should_Have_Unique_Id()
    {
        var control1 = new Control();
        var control2 = new Control();

        Assert.NotEqual(control1.UniqueId, control2.UniqueId);
        Assert.True(control1.UniqueId > 0);
        Assert.True(control2.UniqueId > 0);
    }

    [Fact]
    public void Control_Should_Accept_Initial_Value()
    {
        var control = new Control("initial");

        Assert.Equal("initial", control.Value);
    }

    [Fact]
    public void Control_Should_Default_To_Null_Value()
    {
        var control = new Control();

        Assert.Null(control.Value);
    }

    [Fact]
    public void Setting_Value_Should_Trigger_Notification()
    {
        var control = new Control();
        var editor = new ControlEditor();
        var changeNotified = false;
        ControlChange notifiedChange = ControlChange.None;
        IControl? notifiedControl = null;

        var subscription = control.Subscribe((ctrl, change) =>
        {
            changeNotified = true;
            notifiedChange = change;
            notifiedControl = ctrl;
        }, ControlChange.Value);

        editor.SetValue(control, "new value");

        Assert.True(changeNotified);
        Assert.Equal(ControlChange.Value, notifiedChange);
        Assert.Same(control, notifiedControl);
    }

    [Fact]
    public void Setting_Same_Value_Should_Not_Trigger_Notification()
    {
        var control = new Control("initial");
        var editor = new ControlEditor();
        var changeNotified = false;

        var subscription = control.Subscribe((ctrl, change) =>
        {
            changeNotified = true;
        }, ControlChange.Value);

        editor.SetValue(control, "initial"); // Same value

        Assert.False(changeNotified);
    }

    [Fact]
    public void Unsubscribe_Should_Stop_Notifications()
    {
        var control = new Control();
        var editor = new ControlEditor();
        var changeNotified = false;

        var subscription = control.Subscribe((ctrl, change) =>
        {
            changeNotified = true;
        }, ControlChange.Value);

        subscription.Unsubscribe();
        editor.SetValue(control, "new value");

        Assert.False(changeNotified);
    }

    [Fact]
    public void Multiple_Subscribers_Should_All_Be_Notified()
    {
        var control = new Control();
        var editor = new ControlEditor();
        var change1Notified = false;
        var change2Notified = false;

        var subscription1 = control.Subscribe((ctrl, change) =>
        {
            change1Notified = true;
        }, ControlChange.Value);

        var subscription2 = control.Subscribe((ctrl, change) =>
        {
            change2Notified = true;
        }, ControlChange.Value);

        editor.SetValue(control, "new value");

        Assert.True(change1Notified);
        Assert.True(change2Notified);
    }

    [Fact]
    public void Subscription_Should_Only_Fire_For_Subscribed_Changes()
    {
        var control = new Control();
        var editor = new ControlEditor();
        var valueChangeNotified = false;
        var allChangeNotified = false;

        // Subscribe only to Value changes
        var valueSubscription = control.Subscribe((ctrl, change) =>
        {
            valueChangeNotified = true;
        }, ControlChange.Value);

        // Subscribe to all changes
        var allSubscription = control.Subscribe((ctrl, change) =>
        {
            allChangeNotified = true;
        }, ControlChange.All);

        editor.SetValue(control, "new value");

        Assert.True(valueChangeNotified);
        Assert.True(allChangeNotified);
    }

    [Fact]
    public void Control_Should_Initialize_With_Same_Initial_And_Current_Value()
    {
        var control1 = new Control();
        var control2 = new Control("test");

        Assert.Null(control1.InitialValue);
        Assert.Null(control1.Value);
        Assert.Equal(control1.InitialValue, control1.Value);

        Assert.Equal("test", control2.InitialValue);
        Assert.Equal("test", control2.Value);
        Assert.Equal(control2.InitialValue, control2.Value);
    }

    [Fact]
    public void Control_Should_Not_Be_Dirty_Initially()
    {
        var control1 = new Control();
        var control2 = new Control("initial");

        Assert.False(control1.IsDirty);
        Assert.False(control2.IsDirty);
    }

    [Fact]
    public void Control_Should_Be_Dirty_When_Value_Changes()
    {
        var control = new Control("initial");
        var editor = new ControlEditor();

        Assert.False(control.IsDirty);

        editor.SetValue(control, "changed");

        Assert.True(control.IsDirty);
        Assert.Equal("initial", control.InitialValue);
        Assert.Equal("changed", control.Value);
    }

    [Fact]
    public void Control_Should_Not_Be_Dirty_When_Value_Reverts_To_Initial()
    {
        var control = new Control("initial");
        var editor = new ControlEditor();

        editor.SetValue(control, "changed");
        Assert.True(control.IsDirty);

        editor.SetValue(control, "initial");
        Assert.False(control.IsDirty);
    }

    [Fact]
    public void Control_Should_Not_Be_Disabled_Initially()
    {
        var control = new Control();

        Assert.False(control.IsDisabled);
    }

    [Fact]
    public void Dirty_State_Should_Be_Computed_Property()
    {
        var control = new Control("initial");
        var editor = new ControlEditor();

        // Test multiple changes to verify it's computed, not cached
        editor.SetValue(control, "changed1");
        Assert.True(control.IsDirty);

        editor.SetValue(control, "changed2");
        Assert.True(control.IsDirty);

        editor.SetValue(control, "initial");
        Assert.False(control.IsDirty);

        editor.SetValue(control, "changed3");
        Assert.True(control.IsDirty);
    }

    [Fact]
    public void Subscribers_Should_Only_Receive_Changes_They_Subscribed_To()
    {
        var control = new Control("initial");
        var editor = new ControlEditor();
        var dirtyChangeReceived = false;
        var disabledChangeReceived = false;
        var valueChangeReceived = false;

        // Subscribe only to dirty changes
        control.Subscribe((ctrl, change) =>
        {
            dirtyChangeReceived = (change & ControlChange.Dirty) != 0;
        }, ControlChange.Dirty);

        // Subscribe only to disabled changes
        control.Subscribe((ctrl, change) =>
        {
            disabledChangeReceived = (change & ControlChange.Disabled) != 0;
        }, ControlChange.Disabled);

        // Subscribe only to value changes
        control.Subscribe((ctrl, change) =>
        {
            valueChangeReceived = (change & ControlChange.Value) != 0;
        }, ControlChange.Value);

        // Make control dirty and disabled
        editor.SetValue(control, "changed");
        editor.SetDisabled(control, true);

        // Verify each subscriber only received their subscribed changes
        Assert.True(dirtyChangeReceived);
        Assert.True(disabledChangeReceived);
        Assert.True(valueChangeReceived);

        // Reset flags
        dirtyChangeReceived = false;
        disabledChangeReceived = false;
        valueChangeReceived = false;

        // Change only initial value (should not trigger dirty/disabled subscribers)
        editor.SetInitialValue(control, "new initial");

        Assert.False(dirtyChangeReceived);
        Assert.False(disabledChangeReceived);
        Assert.False(valueChangeReceived);
    }

    [Fact]
    public void Dirty_Change_Should_Notify_Subscribers()
    {
        var control = new Control("initial");
        var editor = new ControlEditor();
        var dirtyChangeNotified = false;
        var valueChangeNotified = false;
        ControlChange notifiedChange = ControlChange.None;

        // Subscribe to dirty changes
        control.Subscribe((ctrl, change) =>
        {
            if ((change & ControlChange.Dirty) != 0)
                dirtyChangeNotified = true;
        }, ControlChange.Dirty);

        // Subscribe to value changes
        control.Subscribe((ctrl, change) =>
        {
            if ((change & ControlChange.Value) != 0)
                valueChangeNotified = true;
            notifiedChange = change;
        }, ControlChange.Value);

        // Change value - should trigger both value and dirty notifications
        editor.SetValue(control, "changed");

        Assert.True(valueChangeNotified);
        Assert.True(dirtyChangeNotified);
    }

    [Fact]
    public void Disabled_Change_Should_Notify_Subscribers()
    {
        var control = new Control();
        var editor = new ControlEditor();
        var disabledChangeNotified = false;
        ControlChange notifiedChange = ControlChange.None;

        control.Subscribe((ctrl, change) =>
        {
            disabledChangeNotified = true;
            notifiedChange = change;
        }, ControlChange.Disabled);

        editor.SetDisabled(control, true);

        Assert.True(disabledChangeNotified);
        Assert.Equal(ControlChange.Disabled, notifiedChange);
        Assert.True(control.IsDisabled);
    }
}