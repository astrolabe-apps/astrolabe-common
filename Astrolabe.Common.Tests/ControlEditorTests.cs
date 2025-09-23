using Astrolabe.Controls;
using Xunit;

namespace Astrolabe.Common.Tests;

public class ControlEditorTests
{
    [Fact]
    public void Single_SetValue_Should_Auto_Wrap_In_Transaction()
    {
        var control = new Control();
        var editor = new ControlEditor();
        var changeNotified = false;

        var subscription = control.Subscribe((ctrl, change) =>
        {
            changeNotified = true;
        }, ControlChange.Value);

        editor.SetValue(control, "new value");

        Assert.True(changeNotified);
        Assert.Equal("new value", control.Value);
    }

    [Fact]
    public void RunInTransaction_Should_Batch_Notifications()
    {
        var control1 = new Control();
        var control2 = new Control();
        var editor = new ControlEditor();
        var notificationCount = 0;

        control1.Subscribe((ctrl, change) => notificationCount++, ControlChange.Value);
        control2.Subscribe((ctrl, change) => notificationCount++, ControlChange.Value);

        editor.RunInTransaction(() =>
        {
            editor.SetValue(control1, "value1");
            Assert.Equal(0, notificationCount); // No notifications yet

            editor.SetValue(control2, "value2");
            Assert.Equal(0, notificationCount); // Still no notifications
        });

        // Notifications fire after transaction
        Assert.Equal(2, notificationCount);
        Assert.Equal("value1", control1.Value);
        Assert.Equal("value2", control2.Value);
    }

    [Fact]
    public void Nested_Transactions_Should_Defer_Until_Outermost_Completes()
    {
        var control1 = new Control();
        var control2 = new Control();
        var control3 = new Control();
        var editor = new ControlEditor();
        var notificationCount = 0;

        control1.Subscribe((ctrl, change) => notificationCount++, ControlChange.Value);
        control2.Subscribe((ctrl, change) => notificationCount++, ControlChange.Value);
        control3.Subscribe((ctrl, change) => notificationCount++, ControlChange.Value);

        editor.RunInTransaction(() =>
        {
            editor.SetValue(control1, "outer1");
            Assert.Equal(0, notificationCount);

            editor.RunInTransaction(() =>
            {
                editor.SetValue(control2, "inner1");
                editor.SetValue(control3, "inner2");
                Assert.Equal(0, notificationCount); // Still no notifications
            }); // Inner transaction completes but notifications still deferred

            Assert.Equal(0, notificationCount);
            editor.SetValue(control1, "outer2");
        }); // Outer transaction completes

        // All notifications fire together
        Assert.Equal(3, notificationCount);
        Assert.Equal("outer2", control1.Value);
        Assert.Equal("inner1", control2.Value);
        Assert.Equal("inner2", control3.Value);
    }

    [Fact]
    public void Setting_Same_Value_In_Transaction_Should_Not_Track_Control()
    {
        var control = new Control("initial");
        var editor = new ControlEditor();
        var notificationCount = 0;

        control.Subscribe((ctrl, change) => notificationCount++, ControlChange.Value);

        editor.RunInTransaction(() =>
        {
            editor.SetValue(control, "initial"); // Same value
        });

        // No notification should fire
        Assert.Equal(0, notificationCount);
    }

    [Fact]
    public void Multiple_Changes_To_Same_Control_Should_Only_Notify_Once()
    {
        var control = new Control();
        var editor = new ControlEditor();
        var notificationCount = 0;

        control.Subscribe((ctrl, change) => notificationCount++, ControlChange.Value);

        editor.RunInTransaction(() =>
        {
            editor.SetValue(control, "value1");
            editor.SetValue(control, "value2");
            editor.SetValue(control, "value3");
        });

        // Only one notification despite multiple changes
        Assert.Equal(1, notificationCount);
        Assert.Equal("value3", control.Value);
    }

    [Fact]
    public void Exception_In_Transaction_Should_Still_Complete_Transaction()
    {
        var control = new Control();
        var editor = new ControlEditor();
        var notificationCount = 0;

        control.Subscribe((ctrl, change) => notificationCount++, ControlChange.Value);

        Assert.Throws<InvalidOperationException>(() =>
        {
            editor.RunInTransaction(() =>
            {
                editor.SetValue(control, "value1");
                throw new InvalidOperationException("Test exception");
            });
        });

        // Notification should still fire despite exception
        Assert.Equal(1, notificationCount);
        Assert.Equal("value1", control.Value);
    }
}