using Astrolabe.Controls;
using Xunit;

namespace Astrolabe.Common.Tests;

public class ControlTests
{
    [Fact]
    public void Control_Should_Have_Unique_Id()
    {
        var control1 = Control.Create();
        var control2 = Control.Create();

        Assert.NotEqual(control1.UniqueId, control2.UniqueId);
        Assert.True(control1.UniqueId > 0);
        Assert.True(control2.UniqueId > 0);
    }

    [Fact]
    public void Control_Constructor_Should_Set_Explicit_Values()
    {
        var control = Control.Create("current", "initial", ControlFlags.Disabled);

        Assert.Equal("current", control.ValueObject);
        Assert.Equal("initial", control.InitialValueObject);
        Assert.True(control.IsDisabled);
        Assert.True(control.IsDirty); // current != initial
    }

    [Fact]
    public void Control_Factory_Should_Create_Clean_Control()
    {
        var control = Control.Create("value");

        Assert.Equal("value", control.ValueObject);
        Assert.Equal("value", control.InitialValueObject);
        Assert.False(control.IsDisabled);
        Assert.False(control.IsDirty); // value == initialValue
    }

    [Fact]
    public void Control_Should_Accept_Initial_Value()
    {
        var control = Control.Create("initial");

        Assert.Equal("initial", control.ValueObject);
    }

    [Fact]
    public void Control_Should_Default_To_Null_Value()
    {
        var control = Control.Create();

        Assert.Null(control.ValueObject);
    }

    [Fact]
    public void Setting_Value_Should_Trigger_Notification()
    {
        var control = Control.Create();
        var editor = new ControlEditor();
        var changeNotified = false;
        ControlChange notifiedChange = ControlChange.None;
        IControl? notifiedControl = null;

        var subscription = control.Subscribe(
            (ctrl, change, editor) =>
            {
                changeNotified = true;
                notifiedChange = change;
                notifiedControl = ctrl;
            },
            ControlChange.Value
        );

        editor.SetValue(control, "new value");

        Assert.True(changeNotified);
        Assert.Equal(ControlChange.Value, notifiedChange);
        Assert.Same(control, notifiedControl);
    }

    [Fact]
    public void Setting_Same_Value_Should_Not_Trigger_Notification()
    {
        var control = Control.Create("initial");
        var editor = new ControlEditor();
        var changeNotified = false;

        var subscription = control.Subscribe(
            (ctrl, change, editor) =>
            {
                changeNotified = true;
            },
            ControlChange.Value
        );

        editor.SetValue(control, "initial"); // Same value

        Assert.False(changeNotified);
    }

    [Fact]
    public void Unsubscribe_Should_Stop_Notifications()
    {
        var control = Control.Create();
        var editor = new ControlEditor();
        var changeNotified = false;

        var subscription = control.Subscribe(
            (ctrl, change, editor) =>
            {
                changeNotified = true;
            },
            ControlChange.Value
        );

        subscription.Dispose();
        editor.SetValue(control, "new value");

        Assert.False(changeNotified);
    }

    [Fact]
    public void Multiple_Subscribers_Should_All_Be_Notified()
    {
        var control = Control.Create();
        var editor = new ControlEditor();
        var change1Notified = false;
        var change2Notified = false;

        var subscription1 = control.Subscribe(
            (ctrl, change, editor) =>
            {
                change1Notified = true;
            },
            ControlChange.Value
        );

        var subscription2 = control.Subscribe(
            (ctrl, change, editor) =>
            {
                change2Notified = true;
            },
            ControlChange.Value
        );

        editor.SetValue(control, "new value");

        Assert.True(change1Notified);
        Assert.True(change2Notified);
    }

    [Fact]
    public void Subscription_Should_Only_Fire_For_Subscribed_Changes()
    {
        var control = Control.Create();
        var editor = new ControlEditor();
        var valueChangeNotified = false;
        var allChangeNotified = false;

        // Subscribe only to Value changes
        var valueSubscription = control.Subscribe(
            (ctrl, change, editor) =>
            {
                valueChangeNotified = true;
            },
            ControlChange.Value
        );

        // Subscribe to all changes
        var allSubscription = control.Subscribe(
            (ctrl, change, editor) =>
            {
                allChangeNotified = true;
            },
            ControlChange.All
        );

        editor.SetValue(control, "new value");

        Assert.True(valueChangeNotified);
        Assert.True(allChangeNotified);
    }

    [Fact]
    public void Control_Should_Initialize_With_Same_Initial_And_Current_Value()
    {
        var control1 = Control.Create();
        var control2 = Control.Create("test");

        Assert.Null(control1.InitialValueObject);
        Assert.Null(control1.ValueObject);
        Assert.Equal(control1.InitialValueObject, control1.ValueObject);

        Assert.Equal("test", control2.InitialValueObject);
        Assert.Equal("test", control2.ValueObject);
        Assert.Equal(control2.InitialValueObject, control2.ValueObject);
    }

    [Fact]
    public void Control_Should_Not_Be_Dirty_Initially()
    {
        var control1 = Control.Create();
        var control2 = Control.Create("initial");

        Assert.False(control1.IsDirty);
        Assert.False(control2.IsDirty);
    }

    [Fact]
    public void Control_Should_Be_Dirty_When_Value_Changes()
    {
        var control = Control.Create("initial");
        var editor = new ControlEditor();

        Assert.False(control.IsDirty);

        editor.SetValue(control, "changed");

        Assert.True(control.IsDirty);
        Assert.Equal("initial", control.InitialValueObject);
        Assert.Equal("changed", control.ValueObject);
    }

    [Fact]
    public void Control_Should_Not_Be_Dirty_When_Value_Reverts_To_Initial()
    {
        var control = Control.Create("initial");
        var editor = new ControlEditor();

        editor.SetValue(control, "changed");
        Assert.True(control.IsDirty);

        editor.SetValue(control, "initial");
        Assert.False(control.IsDirty);
    }

    [Fact]
    public void Control_Should_Not_Be_Disabled_Initially()
    {
        var control = Control.Create();

        Assert.False(control.IsDisabled);
    }

    [Fact]
    public void Control_Should_Not_Be_Touched_Initially()
    {
        var control = Control.Create();

        Assert.False(control.IsTouched);
    }

    [Fact]
    public void SetTouched_Should_Update_Touched_State()
    {
        var control = Control.Create();
        var editor = new ControlEditor();

        Assert.False(control.IsTouched);

        editor.SetTouched(control, true);

        Assert.True(control.IsTouched);
    }

    [Fact]
    public void SetTouched_Should_Notify_Subscribers()
    {
        var control = Control.Create();
        var editor = new ControlEditor();
        var touchedChangeNotified = false;
        ControlChange notifiedChange = ControlChange.None;

        control.Subscribe(
            (ctrl, change, editor) =>
            {
                touchedChangeNotified = true;
                notifiedChange = change;
            },
            ControlChange.Touched
        );

        editor.SetTouched(control, true);

        Assert.True(touchedChangeNotified);
        Assert.Equal(ControlChange.Touched, notifiedChange);
        Assert.True(control.IsTouched);
    }

    [Fact]
    public void Dirty_State_Should_Be_Computed_Property()
    {
        var control = Control.Create("initial");
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
        var control = Control.Create("initial");
        var editor = new ControlEditor();
        var dirtyChangeReceived = false;
        var disabledChangeReceived = false;
        var valueChangeReceived = false;

        // Subscribe only to dirty changes
        control.Subscribe(
            (ctrl, change, editor) =>
            {
                dirtyChangeReceived = (change & ControlChange.Dirty) != 0;
            },
            ControlChange.Dirty
        );

        // Subscribe only to disabled changes
        control.Subscribe(
            (ctrl, change, editor) =>
            {
                disabledChangeReceived = (change & ControlChange.Disabled) != 0;
            },
            ControlChange.Disabled
        );

        // Subscribe only to value changes
        control.Subscribe(
            (ctrl, change, editor) =>
            {
                valueChangeReceived = (change & ControlChange.Value) != 0;
            },
            ControlChange.Value
        );

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
        var control = Control.Create("initial");
        var editor = new ControlEditor();
        var dirtyChangeNotified = false;
        var valueChangeNotified = false;
        ControlChange notifiedChange = ControlChange.None;

        // Subscribe to dirty changes
        control.Subscribe(
            (ctrl, change, editor) =>
            {
                if ((change & ControlChange.Dirty) != 0)
                    dirtyChangeNotified = true;
            },
            ControlChange.Dirty
        );

        // Subscribe to value changes
        control.Subscribe(
            (ctrl, change, editor) =>
            {
                if ((change & ControlChange.Value) != 0)
                    valueChangeNotified = true;
                notifiedChange = change;
            },
            ControlChange.Value
        );

        // Change value - should trigger both value and dirty notifications
        editor.SetValue(control, "changed");

        Assert.True(valueChangeNotified);
        Assert.True(dirtyChangeNotified);
    }

    [Fact]
    public void Disabled_Change_Should_Notify_Subscribers()
    {
        var control = Control.Create();
        var editor = new ControlEditor();
        var disabledChangeNotified = false;
        ControlChange notifiedChange = ControlChange.None;

        control.Subscribe(
            (ctrl, change, editor) =>
            {
                disabledChangeNotified = true;
                notifiedChange = change;
            },
            ControlChange.Disabled
        );

        editor.SetDisabled(control, true);

        Assert.True(disabledChangeNotified);
        Assert.Equal(ControlChange.Disabled, notifiedChange);
        Assert.True(control.IsDisabled);
    }

    [Fact]
    public void Control_Should_Have_No_Errors_Initially()
    {
        var control = Control.Create();

        Assert.Empty(control.Errors);
        Assert.False(control.HasErrors);
        Assert.True(control.IsValid);
    }

    [Fact]
    public void SetError_Should_Add_Error_To_Control()
    {
        var control = Control.Create();
        var editor = new ControlEditor();

        editor.SetError(control, "required", "Value is required");

        Assert.Single(control.Errors);
        Assert.True(control.HasErrors);
        Assert.False(control.IsValid);
        Assert.Equal("Value is required", control.Errors["required"]);
    }

    [Fact]
    public void SetError_Should_Notify_Subscribers()
    {
        var control = Control.Create();
        var editor = new ControlEditor();
        var errorChangeNotified = false;
        ControlChange notifiedChange = ControlChange.None;

        control.Subscribe(
            (ctrl, change, editor) =>
            {
                errorChangeNotified = true;
                notifiedChange = change;
            },
            ControlChange.Error
        );

        editor.SetError(control, "required", "Value is required");

        Assert.True(errorChangeNotified);
        Assert.Equal(ControlChange.Error, notifiedChange);
    }

    [Fact]
    public void SetError_With_Null_Should_Remove_Error()
    {
        var control = Control.Create();
        var editor = new ControlEditor();

        // Add error
        editor.SetError(control, "required", "Value is required");
        Assert.True(control.HasErrors);

        // Remove error with null
        editor.SetError(control, "required", null);
        Assert.False(control.HasErrors);
        Assert.Empty(control.Errors);
    }

    [Fact]
    public void SetError_With_Empty_String_Should_Remove_Error()
    {
        var control = Control.Create();
        var editor = new ControlEditor();

        // Add error
        editor.SetError(control, "required", "Value is required");
        Assert.True(control.HasErrors);

        // Remove error with empty string
        editor.SetError(control, "required", "");
        Assert.False(control.HasErrors);
        Assert.Empty(control.Errors);
    }

    [Fact]
    public void SetError_Should_Not_Notify_When_Same_Error_Set()
    {
        var control = Control.Create();
        var editor = new ControlEditor();
        var errorChangeCount = 0;

        control.Subscribe(
            (ctrl, change, editor) =>
            {
                if ((change & ControlChange.Error) != 0)
                    errorChangeCount++;
            },
            ControlChange.Error
        );

        // Set error first time
        editor.SetError(control, "required", "Value is required");
        Assert.Equal(1, errorChangeCount);

        // Set same error again
        editor.SetError(control, "required", "Value is required");
        Assert.Equal(1, errorChangeCount); // Should not increment
    }

    [Fact]
    public void SetErrors_Should_Set_Multiple_Errors()
    {
        var control = Control.Create();
        var editor = new ControlEditor();

        var errors = new Dictionary<string, string>
        {
            ["required"] = "Value is required",
            ["minLength"] = "Value must be at least 5 characters"
        };

        editor.SetErrors(control, errors);

        Assert.Equal(2, control.Errors.Count);
        Assert.True(control.HasErrors);
        Assert.False(control.IsValid);
        Assert.Equal("Value is required", control.Errors["required"]);
        Assert.Equal("Value must be at least 5 characters", control.Errors["minLength"]);
    }

    [Fact]
    public void SetErrors_Should_Filter_Out_Empty_Values()
    {
        var control = Control.Create();
        var editor = new ControlEditor();

        var errors = new Dictionary<string, string>
        {
            ["required"] = "Value is required",
            ["empty"] = "",
            ["null"] = null!,
            ["minLength"] = "Value must be at least 5 characters"
        };

        editor.SetErrors(control, errors);

        Assert.Equal(2, control.Errors.Count);
        Assert.Contains("required", control.Errors.Keys);
        Assert.Contains("minLength", control.Errors.Keys);
        Assert.DoesNotContain("empty", control.Errors.Keys);
        Assert.DoesNotContain("null", control.Errors.Keys);
    }

    [Fact]
    public void ClearErrors_Should_Remove_All_Errors()
    {
        var control = Control.Create();
        var editor = new ControlEditor();

        // Add multiple errors
        editor.SetError(control, "required", "Value is required");
        editor.SetError(control, "minLength", "Value must be at least 5 characters");
        Assert.Equal(2, control.Errors.Count);

        // Clear all errors
        editor.ClearErrors(control);
        Assert.Empty(control.Errors);
        Assert.False(control.HasErrors);
        Assert.True(control.IsValid);
    }

    [Fact]
    public void ClearErrors_Should_Notify_Subscribers()
    {
        var control = Control.Create();
        var editor = new ControlEditor();
        var errorChangeNotified = false;

        // Add error first
        editor.SetError(control, "required", "Value is required");

        control.Subscribe(
            (ctrl, change, editor) =>
            {
                errorChangeNotified = true;
            },
            ControlChange.Error
        );

        editor.ClearErrors(control);

        Assert.True(errorChangeNotified);
    }

    [Fact]
    public void SetError_Should_Update_Existing_Error_Message()
    {
        var control = Control.Create();
        var editor = new ControlEditor();

        // Set initial error
        editor.SetError(control, "required", "Value is required");
        Assert.Equal("Value is required", control.Errors["required"]);

        // Update error message
        editor.SetError(control, "required", "This field is mandatory");
        Assert.Single(control.Errors);
        Assert.Equal("This field is mandatory", control.Errors["required"]);
    }

    [Fact]
    public void Multiple_Errors_Can_Exist_Simultaneously()
    {
        var control = Control.Create();
        var editor = new ControlEditor();

        editor.SetError(control, "required", "Value is required");
        editor.SetError(control, "minLength", "Must be at least 5 chars");
        editor.SetError(control, "maxLength", "Must be at most 50 chars");

        Assert.Equal(3, control.Errors.Count);
        Assert.True(control.HasErrors);
        Assert.False(control.IsValid);
        Assert.Equal("Value is required", control.Errors["required"]);
        Assert.Equal("Must be at least 5 chars", control.Errors["minLength"]);
        Assert.Equal("Must be at most 50 chars", control.Errors["maxLength"]);
    }

    [Fact]
    public void Removing_One_Error_Should_Leave_Others_Intact()
    {
        var control = Control.Create();
        var editor = new ControlEditor();

        editor.SetError(control, "required", "Value is required");
        editor.SetError(control, "minLength", "Must be at least 5 chars");
        editor.SetError(control, "maxLength", "Must be at most 50 chars");

        // Remove one error
        editor.SetError(control, "minLength", null);

        Assert.Equal(2, control.Errors.Count);
        Assert.True(control.HasErrors);
        Assert.Contains("required", control.Errors.Keys);
        Assert.Contains("maxLength", control.Errors.Keys);
        Assert.DoesNotContain("minLength", control.Errors.Keys);
    }
}
