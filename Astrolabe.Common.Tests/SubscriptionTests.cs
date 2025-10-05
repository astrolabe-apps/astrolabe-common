using Astrolabe.Controls;
using Xunit;

namespace Astrolabe.Common.Tests;

public class SubscriptionTests
{
    [Fact]
    public void Subscription_Should_Have_Correct_Mask()
    {
        var control = Control.Create();
        var subscription = control.Subscribe((ctrl, change, editor) => { }, ControlChange.Value | ControlChange.Valid);

        Assert.Equal(ControlChange.Value | ControlChange.Valid, subscription.Mask);
    }

    [Fact]
    public void Subscription_Should_Store_Listener()
    {
        var control = Control.Create();
        ChangeListenerFunc listener = (ctrl, change, editor) => { };
        var subscription = control.Subscribe(listener, ControlChange.Value);

        Assert.Same(listener, subscription.Listener);
    }

    [Fact]
    public void Multiple_Subscriptions_Should_Have_Different_Masks()
    {
        var control = Control.Create();

        var subscription1 = control.Subscribe((ctrl, change, editor) => { }, ControlChange.Value);
        var subscription2 = control.Subscribe((ctrl, change, editor) => { }, ControlChange.Valid);

        Assert.Equal(ControlChange.Value, subscription1.Mask);
        Assert.Equal(ControlChange.Valid, subscription2.Mask);
    }

    [Fact]
    public void Unsubscribe_Via_Dispose_Should_Work()
    {
        var control = Control.Create();
        var editor = new ControlEditor();
        var changeNotified = false;

        var subscription = control.Subscribe((ctrl, change, editor) =>
        {
            changeNotified = true;
        }, ControlChange.Value);

        subscription.Dispose();
        editor.SetValue(control, "new value");

        Assert.False(changeNotified);
    }
}