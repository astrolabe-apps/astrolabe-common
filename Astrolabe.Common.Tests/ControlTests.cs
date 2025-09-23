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
        var changeNotified = false;
        ControlChange notifiedChange = ControlChange.None;
        IControl? notifiedControl = null;

        var subscription = control.Subscribe((ctrl, change) =>
        {
            changeNotified = true;
            notifiedChange = change;
            notifiedControl = ctrl;
        }, ControlChange.Value);

        control.Value = "new value";

        Assert.True(changeNotified);
        Assert.Equal(ControlChange.Value, notifiedChange);
        Assert.Same(control, notifiedControl);
    }

    [Fact]
    public void Setting_Same_Value_Should_Not_Trigger_Notification()
    {
        var control = new Control("initial");
        var changeNotified = false;

        var subscription = control.Subscribe((ctrl, change) =>
        {
            changeNotified = true;
        }, ControlChange.Value);

        control.Value = "initial"; // Same value

        Assert.False(changeNotified);
    }

    [Fact]
    public void Unsubscribe_Should_Stop_Notifications()
    {
        var control = new Control();
        var changeNotified = false;

        var subscription = control.Subscribe((ctrl, change) =>
        {
            changeNotified = true;
        }, ControlChange.Value);

        subscription.Unsubscribe();
        control.Value = "new value";

        Assert.False(changeNotified);
    }

    [Fact]
    public void Multiple_Subscribers_Should_All_Be_Notified()
    {
        var control = new Control();
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

        control.Value = "new value";

        Assert.True(change1Notified);
        Assert.True(change2Notified);
    }

    [Fact]
    public void Subscription_Should_Only_Fire_For_Subscribed_Changes()
    {
        var control = new Control();
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

        control.Value = "new value";

        Assert.True(valueChangeNotified);
        Assert.True(allChangeNotified);
    }
}