using Astrolabe.Controls;
using Xunit;

namespace Astrolabe.Common.Tests;

public class ControlEditorTests
{
    [Fact]
    public void Single_SetValue_Should_Auto_Wrap_In_Transaction()
    {
        var control = Control.Create();
        var editor = new ControlEditor();
        var changeNotified = false;

        var subscription = control.Subscribe((ctrl, change, editor) =>
        {
            changeNotified = true;
        }, ControlChange.Value);

        editor.SetValue(control, "new value");

        Assert.True(changeNotified);
        Assert.Equal("new value", control.ValueObject);
    }

    [Fact]
    public void RunInTransaction_Should_Batch_Notifications()
    {
        var control1 = Control.Create();
        var control2 = Control.Create();
        var editor = new ControlEditor();
        var notificationCount = 0;

        control1.Subscribe((ctrl, change, editor) => notificationCount++, ControlChange.Value);
        control2.Subscribe((ctrl, change, editor) => notificationCount++, ControlChange.Value);

        editor.RunInTransaction(() =>
        {
            editor.SetValue(control1, "value1");
            Assert.Equal(0, notificationCount); // No notifications yet

            editor.SetValue(control2, "value2");
            Assert.Equal(0, notificationCount); // Still no notifications
        });

        // Notifications fire after transaction
        Assert.Equal(2, notificationCount);
        Assert.Equal("value1", control1.ValueObject);
        Assert.Equal("value2", control2.ValueObject);
    }

    [Fact]
    public void Nested_Transactions_Should_Defer_Until_Outermost_Completes()
    {
        var control1 = Control.Create();
        var control2 = Control.Create();
        var control3 = Control.Create();
        var editor = new ControlEditor();
        var notificationCount = 0;

        control1.Subscribe((ctrl, change, editor) => notificationCount++, ControlChange.Value);
        control2.Subscribe((ctrl, change, editor) => notificationCount++, ControlChange.Value);
        control3.Subscribe((ctrl, change, editor) => notificationCount++, ControlChange.Value);

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
        Assert.Equal("outer2", control1.ValueObject);
        Assert.Equal("inner1", control2.ValueObject);
        Assert.Equal("inner2", control3.ValueObject);
    }

    [Fact]
    public void Setting_Same_Value_In_Transaction_Should_Not_Track_Control()
    {
        var control = Control.Create("initial");
        var editor = new ControlEditor();
        var notificationCount = 0;

        control.Subscribe((ctrl, change, editor) => notificationCount++, ControlChange.Value);

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
        var control = Control.Create();
        var editor = new ControlEditor();
        var notificationCount = 0;

        control.Subscribe((ctrl, change, editor) => notificationCount++, ControlChange.Value);

        editor.RunInTransaction(() =>
        {
            editor.SetValue(control, "value1");
            editor.SetValue(control, "value2");
            editor.SetValue(control, "value3");
        });

        // Only one notification despite multiple changes
        Assert.Equal(1, notificationCount);
        Assert.Equal("value3", control.ValueObject);
    }

    [Fact]
    public void Exception_In_Transaction_Should_Still_Complete_Transaction()
    {
        var control = Control.Create();
        var editor = new ControlEditor();
        var notificationCount = 0;

        control.Subscribe((ctrl, change, editor) => notificationCount++, ControlChange.Value);

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
        Assert.Equal("value1", control.ValueObject);
    }

    [Fact]
    public void SetInitialValue_Should_Update_Initial_Value_And_Notify()
    {
        var control = Control.Create("initial");
        var editor = new ControlEditor();
        var initialValueChangeNotified = false;
        ControlChange notifiedChange = ControlChange.None;

        control.Subscribe((ctrl, change, editor) =>
        {
            initialValueChangeNotified = true;
            notifiedChange = change;
        }, ControlChange.InitialValue);

        editor.SetInitialValue(control, "new initial");

        Assert.True(initialValueChangeNotified);
        Assert.Equal(ControlChange.InitialValue, notifiedChange);
        Assert.Equal("new initial", control.InitialValueObject);
        Assert.Equal("initial", control.ValueObject); // Value unchanged
    }

    [Fact]
    public void SetInitialValue_With_Same_Value_Should_Not_Notify()
    {
        var control = Control.Create("initial");
        var editor = new ControlEditor();
        var initialValueChangeNotified = false;

        control.Subscribe((ctrl, change, editor) =>
        {
            initialValueChangeNotified = true;
        }, ControlChange.InitialValue);

        editor.SetInitialValue(control, "initial"); // Same as current initial value

        Assert.False(initialValueChangeNotified);
    }

    [Fact]
    public void SetInitialValue_Should_Affect_Dirty_State()
    {
        var control = Control.Create("initial");
        var editor = new ControlEditor();

        // Change value to make it dirty
        editor.SetValue(control, "changed");
        Assert.True(control.IsDirty);

        // Change initial value to match current value
        editor.SetInitialValue(control, "changed");
        Assert.False(control.IsDirty);

        // Change initial value to be different from current value
        editor.SetInitialValue(control, "different");
        Assert.True(control.IsDirty);
    }

    [Fact]
    public void SetDisabled_Should_Update_Disabled_State_And_Notify()
    {
        var control = Control.Create();
        var editor = new ControlEditor();
        var disabledChangeNotified = false;
        ControlChange notifiedChange = ControlChange.None;

        control.Subscribe((ctrl, change, editor) =>
        {
            disabledChangeNotified = true;
            notifiedChange = change;
        }, ControlChange.Disabled);

        Assert.False(control.IsDisabled);

        editor.SetDisabled(control, true);

        Assert.True(disabledChangeNotified);
        Assert.Equal(ControlChange.Disabled, notifiedChange);
        Assert.True(control.IsDisabled);
    }

    [Fact]
    public void SetDisabled_With_Same_State_Should_Not_Notify()
    {
        var control = Control.Create();
        var editor = new ControlEditor();
        var disabledChangeNotified = false;

        control.Subscribe((ctrl, change, editor) =>
        {
            disabledChangeNotified = true;
        }, ControlChange.Disabled);

        editor.SetDisabled(control, false); // Same as initial state

        Assert.False(disabledChangeNotified);
        Assert.False(control.IsDisabled);
    }

    [Fact]
    public void SetDisabled_Should_Work_Both_Ways()
    {
        var control = Control.Create();
        var editor = new ControlEditor();
        var notificationCount = 0;

        control.Subscribe((ctrl, change, editor) =>
        {
            notificationCount++;
        }, ControlChange.Disabled);

        // Enable -> Disable
        editor.SetDisabled(control, true);
        Assert.True(control.IsDisabled);
        Assert.Equal(1, notificationCount);

        // Disable -> Enable
        editor.SetDisabled(control, false);
        Assert.False(control.IsDisabled);
        Assert.Equal(2, notificationCount);
    }

    [Fact]
    public void MarkAsClean_Should_Set_Initial_Value_To_Current_Value()
    {
        var control = Control.Create("initial");
        var editor = new ControlEditor();

        editor.SetValue(control, "changed");
        Assert.True(control.IsDirty);
        Assert.Equal("initial", control.InitialValueObject);
        Assert.Equal("changed", control.ValueObject);

        editor.MarkAsClean(control);

        Assert.False(control.IsDirty);
        Assert.Equal("changed", control.InitialValueObject);
        Assert.Equal("changed", control.ValueObject);
    }

    [Fact]
    public void MarkAsClean_Should_Notify_Initial_Value_Change()
    {
        var control = Control.Create("initial");
        var editor = new ControlEditor();
        var initialValueChangeNotified = false;

        editor.SetValue(control, "changed");

        control.Subscribe((ctrl, change, editor) =>
        {
            initialValueChangeNotified = true;
        }, ControlChange.InitialValue);

        editor.MarkAsClean(control);

        Assert.True(initialValueChangeNotified);
    }

    [Fact]
    public void Multiple_State_Changes_In_Transaction_Should_Batch_Properly()
    {
        var control = Control.Create("initial");
        var editor = new ControlEditor();
        var valueNotificationCount = 0;
        var initialValueNotificationCount = 0;
        var disabledNotificationCount = 0;

        control.Subscribe((ctrl, change, editor) => valueNotificationCount++, ControlChange.Value);
        control.Subscribe((ctrl, change, editor) => initialValueNotificationCount++, ControlChange.InitialValue);
        control.Subscribe((ctrl, change, editor) => disabledNotificationCount++, ControlChange.Disabled);

        editor.RunInTransaction(() =>
        {
            editor.SetValue(control, "changed");
            editor.SetInitialValue(control, "new initial");
            editor.SetDisabled(control, true);

            // No notifications yet
            Assert.Equal(0, valueNotificationCount);
            Assert.Equal(0, initialValueNotificationCount);
            Assert.Equal(0, disabledNotificationCount);
        });

        // All notifications fire after transaction
        Assert.Equal(1, valueNotificationCount);
        Assert.Equal(1, initialValueNotificationCount);
        Assert.Equal(1, disabledNotificationCount);

        Assert.Equal("changed", control.ValueObject);
        Assert.Equal("new initial", control.InitialValueObject);
        Assert.True(control.IsDisabled);
        Assert.True(control.IsDirty); // Still dirty because value != initial
    }

}