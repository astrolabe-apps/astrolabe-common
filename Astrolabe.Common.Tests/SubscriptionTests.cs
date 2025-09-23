using Astrolabe.Controls;
using Xunit;

namespace Astrolabe.Common.Tests;

public class SubscriptionTests
{
    [Fact]
    public void Subscription_Should_Have_Correct_Mask()
    {
        var control = new Control();
        var subscription = control.Subscribe((ctrl, change) => { }, ControlChange.Value | ControlChange.Valid);

        Assert.Equal(ControlChange.Value | ControlChange.Valid, subscription.Mask);
    }

    [Fact]
    public void Subscription_Should_Store_Listener()
    {
        var control = new Control();
        ChangeListenerFunc listener = (ctrl, change) => { };
        var subscription = control.Subscribe(listener, ControlChange.Value);

        Assert.Same(listener, subscription.Listener);
    }

    [Fact]
    public void Multiple_Subscriptions_Should_Have_Different_Masks()
    {
        var control = new Control();

        var subscription1 = control.Subscribe((ctrl, change) => { }, ControlChange.Value);
        var subscription2 = control.Subscribe((ctrl, change) => { }, ControlChange.Valid);

        Assert.Equal(ControlChange.Value, subscription1.Mask);
        Assert.Equal(ControlChange.Valid, subscription2.Mask);
    }

    [Fact]
    public void Unsubscribe_Via_Control_Should_Work()
    {
        var control = new Control();
        var changeNotified = false;

        var subscription = control.Subscribe((ctrl, change) =>
        {
            changeNotified = true;
        }, ControlChange.Value);

        control.Unsubscribe(subscription);
        control.Value = "new value";

        Assert.False(changeNotified);
    }
}