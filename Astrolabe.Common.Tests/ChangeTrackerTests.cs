using Astrolabe.Controls;
using Xunit;

namespace Astrolabe.Common.Tests;

public class ChangeTrackerTests
{
    [Fact]
    public void Tracked_Should_Return_Proxy_That_Accesses_Control_Value()
    {
        var tracker = new ChangeTracker();
        var control = Control.Create("test");
        var typedControl = control.AsTyped<string>();

        var tracked = tracker.Tracked(typedControl);

        Assert.Equal("test", tracked.Value);
    }

    [Fact]
    public void UpdateSubscriptions_Should_Subscribe_To_Accessed_Properties()
    {
        var tracker = new ChangeTracker();
        var control = Control.Create("initial");
        var typedControl = control.AsTyped<string>();
        var callbackCount = 0;

        // Set up callback
        tracker.SetCallback(() => callbackCount++);

        // Access Value property
        var tracked = tracker.Tracked(typedControl);
        _ = tracked.Value;

        // Establish subscriptions
        tracker.UpdateSubscriptions();

        // Change the value - should trigger callback
        var editor = new ControlEditor();
        editor.SetValue(control, "changed");

        Assert.Equal(1, callbackCount);
    }

    [Fact]
    public void UpdateSubscriptions_Should_Not_Subscribe_To_Non_Accessed_Properties()
    {
        var tracker = new ChangeTracker();
        var control = Control.Create("initial");
        var typedControl = control.AsTyped<string>();
        var callbackCount = 0;

        tracker.SetCallback(() => callbackCount++);

        // Access only Value, not IsDirty
        var tracked = tracker.Tracked(typedControl);
        _ = tracked.Value;

        tracker.UpdateSubscriptions();

        // Change touched state - should NOT trigger callback
        var editor = new ControlEditor();
        editor.SetTouched(control, true);

        Assert.Equal(0, callbackCount);
    }

    [Fact]
    public void Callback_Should_Retrack_Dependencies()
    {
        var tracker = new ChangeTracker();
        var control = Control.Create("initial");
        var typedControl = control.AsTyped<string>();
        var callbackCount = 0;

        tracker.SetCallback(() => {
            callbackCount++;
            var tracked = tracker.Tracked(typedControl);
            _ = tracked.Value;
            tracker.UpdateSubscriptions();
        });

        // Initial evaluation
        var tracked = tracker.Tracked(typedControl);
        _ = tracked.Value;
        tracker.UpdateSubscriptions();

        // Change value - should trigger callback and re-track
        var editor = new ControlEditor();
        editor.SetValue(control, "changed1");

        Assert.Equal(1, callbackCount);

        // Change again - should still work
        editor.SetValue(control, "changed2");

        Assert.Equal(2, callbackCount);
    }

    [Fact]
    public void UpdateSubscriptions_Should_Track_Multiple_Properties()
    {
        var tracker = new ChangeTracker();
        var control = Control.Create("initial");
        var typedControl = control.AsTyped<string>();
        var callbackCount = 0;

        tracker.SetCallback(() => callbackCount++);

        // Access multiple properties
        var tracked = tracker.Tracked(typedControl);
        _ = tracked.Value;
        _ = tracked.IsDirty;

        tracker.UpdateSubscriptions();

        var editor = new ControlEditor();

        // Changing value should trigger (affects both Value and IsDirty)
        editor.SetValue(control, "changed");
        Assert.Equal(1, callbackCount);

        // Changing initial value should trigger (affects IsDirty)
        editor.SetInitialValue(control, "changed");
        Assert.Equal(2, callbackCount);
    }

    [Fact]
    public void UpdateSubscriptions_Should_Track_Multiple_Controls()
    {
        var tracker = new ChangeTracker();
        var control1 = Control.Create("a");
        var control2 = Control.Create("b");
        var callbackCount = 0;

        tracker.SetCallback(() => callbackCount++);

        // Access both controls
        var tracked1 = tracker.Tracked(control1.AsTyped<string>());
        var tracked2 = tracker.Tracked(control2.AsTyped<string>());
        _ = tracked1.Value;
        _ = tracked2.Value;

        tracker.UpdateSubscriptions();

        var editor = new ControlEditor();

        // Changing either control should trigger callback
        editor.SetValue(control1, "changed");
        Assert.Equal(1, callbackCount);

        editor.SetValue(control2, "changed");
        Assert.Equal(2, callbackCount);
    }

    [Fact]
    public void UpdateSubscriptions_Should_Remove_Unused_Subscriptions()
    {
        var tracker = new ChangeTracker();
        var control1 = Control.Create("a");
        var control2 = Control.Create("b");
        var callbackCount = 0;

        tracker.SetCallback(() => callbackCount++);

        // First evaluation - track control1
        var tracked1 = tracker.Tracked(control1.AsTyped<string>());
        _ = tracked1.Value;
        tracker.UpdateSubscriptions();

        // Second evaluation - track only control2
        var tracked2 = tracker.Tracked(control2.AsTyped<string>());
        _ = tracked2.Value;
        tracker.UpdateSubscriptions();

        var editor = new ControlEditor();

        // Changing control1 should NOT trigger (subscription removed)
        editor.SetValue(control1, "changed");
        Assert.Equal(0, callbackCount);

        // Changing control2 should trigger
        editor.SetValue(control2, "changed");
        Assert.Equal(1, callbackCount);
    }

    [Fact]
    public void Dispose_Should_Remove_All_Subscriptions()
    {
        var tracker = new ChangeTracker();
        var control = Control.Create("initial");
        var callbackCount = 0;

        tracker.SetCallback(() => callbackCount++);

        var tracked = tracker.Tracked(control.AsTyped<string>());
        _ = tracked.Value;
        tracker.UpdateSubscriptions();

        // Dispose tracker
        tracker.Dispose();

        // Changes should not trigger callback
        var editor = new ControlEditor();
        editor.SetValue(control, "changed");

        Assert.Equal(0, callbackCount);
    }

    [Fact]
    public void TrackedProxy_Should_Access_All_Properties()
    {
        var tracker = new ChangeTracker();
        var control = new Control("value", "initial", ControlFlags.Touched | ControlFlags.Disabled);
        var editor = new ControlEditor();
        editor.SetError(control, "test", "error");

        var tracked = tracker.Tracked(control.AsTyped<string>());

        Assert.Equal("value", tracked.Value);
        Assert.Equal("initial", tracked.InitialValue);
        Assert.True(tracked.IsDirty);
        Assert.True(tracked.IsDisabled);
        Assert.True(tracked.IsTouched);
        Assert.False(tracked.IsValid);
        Assert.Single(tracked.Errors);
        Assert.True(tracked.HasErrors);
        Assert.False(tracked.IsUndefined);
    }

    [Fact]
    public void Callback_Should_Only_Run_Once_Per_Transaction()
    {
        var tracker = new ChangeTracker();
        var control = Control.Create("initial");
        var callbackCount = 0;

        tracker.SetCallback(() => callbackCount++);

        var tracked = tracker.Tracked(control.AsTyped<string>());
        _ = tracked.Value;
        tracker.UpdateSubscriptions();

        var editor = new ControlEditor();

        // Multiple changes in one transaction should only trigger callback once
        editor.RunInTransaction(() => {
            editor.SetValue(control, "change1");
            editor.SetValue(control, "change2");
            editor.SetValue(control, "change3");
        });

        Assert.Equal(1, callbackCount);
    }

    [Fact]
    public void Callback_Should_Run_After_All_Listeners()
    {
        var tracker = new ChangeTracker();
        var control = Control.Create("initial");
        var executionOrder = new List<string>();

        // Add a listener to the control
        control.UnderlyingControl.Subscribe((ctrl, change, editor) => {
            executionOrder.Add("listener");
        }, ControlChange.Value);

        // Set up tracker callback
        tracker.SetCallback(() => {
            executionOrder.Add("tracker-callback");
        });

        var tracked = tracker.Tracked(control.AsTyped<string>());
        _ = tracked.Value;
        tracker.UpdateSubscriptions();

        var editor = new ControlEditor();
        editor.SetValue(control, "changed");

        // Verify order: listener runs first, then tracker callback
        Assert.Equal(2, executionOrder.Count);
        Assert.Equal("listener", executionOrder[0]);
        Assert.Equal("tracker-callback", executionOrder[1]);
    }

    [Fact]
    public void Multiple_Tracker_Callbacks_Should_Batch_In_Same_Transaction()
    {
        var tracker = new ChangeTracker();
        var control1 = Control.Create("a");
        var control2 = Control.Create("b");
        var callbackCount = 0;

        tracker.SetCallback(() => callbackCount++);

        // Track both controls
        var tracked1 = tracker.Tracked(control1.AsTyped<string>());
        var tracked2 = tracker.Tracked(control2.AsTyped<string>());
        _ = tracked1.Value;
        _ = tracked2.Value;
        tracker.UpdateSubscriptions();

        var editor = new ControlEditor();

        // Change both controls in one transaction
        editor.RunInTransaction(() => {
            editor.SetValue(control1, "changed1");
            editor.SetValue(control2, "changed2");
        });

        // Callback should only run once even though two controls changed
        Assert.Equal(1, callbackCount);
    }

    [Fact]
    public void Tracked_Should_Combine_Multiple_Access_Masks()
    {
        var tracker = new ChangeTracker();
        var control = Control.Create("initial");
        var callbackCount = 0;

        tracker.SetCallback(() => callbackCount++);

        // Access same control's Value property multiple times
        var tracked = tracker.Tracked(control.AsTyped<string>());
        _ = tracked.Value;
        _ = tracked.Value;
        _ = tracked.IsValid;

        tracker.UpdateSubscriptions();

        var editor = new ControlEditor();

        // Should have combined mask (Value | Valid)
        editor.SetValue(control, "changed");
        Assert.Equal(1, callbackCount);

        editor.SetError(control, "test", "error");
        Assert.Equal(2, callbackCount);
    }

    [Fact]
    public void CreateComputed_Should_Compute_Initial_Value()
    {
        var firstName = Control.CreateTyped("John");
        var lastName = Control.CreateTyped("Doe");
        var editor = new ControlEditor();

        var fullName = Control.CreateComputed(tracker =>
        {
            var first = tracker.Tracked(firstName).Value;
            var last = tracker.Tracked(lastName).Value;
            return $"{first} {last}";
        }, editor);

        Assert.Equal("John Doe", fullName.Value);
    }

    [Fact]
    public void CreateComputed_Should_Update_When_Dependencies_Change()
    {
        var firstName = Control.CreateTyped("John");
        var lastName = Control.CreateTyped("Doe");
        var editor = new ControlEditor();

        var fullName = Control.CreateComputed(tracker =>
        {
            var first = tracker.Tracked(firstName).Value;
            var last = tracker.Tracked(lastName).Value;
            return $"{first} {last}";
        }, editor);

        Assert.Equal("John Doe", fullName.Value);

        // Change first name
        editor.SetValue(firstName, "Jane");
        Assert.Equal("Jane Doe", fullName.Value);

        // Change last name
        editor.SetValue(lastName, "Smith");
        Assert.Equal("Jane Smith", fullName.Value);
    }

    [Fact]
    public void CreateComputed_Should_Track_Multiple_Properties()
    {
        var control = Control.CreateTyped("test");
        var editor = new ControlEditor();

        var computed = Control.CreateComputed(tracker =>
        {
            var props = tracker.Tracked(control);
            return $"{props.Value}:{props.IsDirty}:{props.IsTouched}";
        }, editor);

        Assert.Equal("test:False:False", computed.Value);

        // Change value - affects both Value and IsDirty
        editor.SetValue(control, "changed");
        Assert.Equal("changed:True:False", computed.Value);

        // Change touched
        editor.SetTouched(control, true);
        Assert.Equal("changed:True:True", computed.Value);
    }

    [Fact]
    public void CreateComputed_Should_Work_With_Conditional_Dependencies()
    {
        var useFirstName = Control.CreateTyped(true);
        var firstName = Control.CreateTyped("John");
        var lastName = Control.CreateTyped("Doe");
        var editor = new ControlEditor();

        var displayName = Control.CreateComputed(tracker =>
        {
            var useFirst = tracker.Tracked(useFirstName).Value;
            if (useFirst)
            {
                return tracker.Tracked(firstName).Value;
            }
            else
            {
                return tracker.Tracked(lastName).Value;
            }
        }, editor);

        Assert.Equal("John", displayName.Value);

        // Changing lastName shouldn't trigger update (not tracked)
        editor.SetValue(lastName, "Smith");
        Assert.Equal("John", displayName.Value);

        // Switch to using lastName
        editor.SetValue(useFirstName, false);
        Assert.Equal("Smith", displayName.Value);

        // Now changing firstName shouldn't trigger update
        editor.SetValue(firstName, "Jane");
        Assert.Equal("Smith", displayName.Value);

        // Changing lastName should trigger update now
        editor.SetValue(lastName, "Jones");
        Assert.Equal("Jones", displayName.Value);
    }

    [Fact]
    public void CreateComputed_Should_Support_Chained_Computations()
    {
        var firstName = Control.CreateTyped("John");
        var lastName = Control.CreateTyped("Doe");
        var editor = new ControlEditor();

        var fullName = Control.CreateComputed(tracker =>
        {
            var first = tracker.Tracked(firstName).Value;
            var last = tracker.Tracked(lastName).Value;
            return $"{first} {last}";
        }, editor);

        var greeting = Control.CreateComputed(tracker =>
        {
            var name = tracker.Tracked(fullName).Value;
            return $"Hello, {name}!";
        }, editor);

        Assert.Equal("Hello, John Doe!", greeting.Value);

        editor.SetValue(firstName, "Jane");
        Assert.Equal("Hello, Jane Doe!", greeting.Value);
    }

    [Fact]
    public void MakeComputed_Should_Update_Existing_Control()
    {
        var firstName = Control.CreateTyped("John");
        var target = Control.CreateTyped("initial");
        var editor = new ControlEditor();

        // Make target computed based on firstName
        Control.MakeComputed(target, tracker =>
        {
            var name = tracker.Tracked(firstName).Value;
            return name.ToUpper();
        }, editor);

        Assert.Equal("JOHN", target.Value);

        editor.SetValue(firstName, "Jane");
        Assert.Equal("JANE", target.Value);
    }

    [Fact]
    public void MakeComputed_Should_Work_With_Structured_Control_Fields()
    {
        var condition = Control.CreateTyped(true);
        var editor = new ControlEditor();

        var baseCtrl = Control.CreateStructured(new { Visible = (bool?)null, Readonly = false });
        var visibleField = baseCtrl.Field(x => x.Visible);

        // Make the Visible field computed
        Control.MakeComputed(visibleField, tracker =>
        {
            var cond = tracker.Tracked(condition).Value;
            return cond ? true : (bool?)null;
        }, editor);

        Assert.True(visibleField.Value);

        editor.SetValue(condition, false);
        Assert.Null(visibleField.Value);
    }

    [Fact]
    public void MakeComputed_Should_Track_Multiple_Dependencies()
    {
        var a = Control.CreateTyped(10);
        var b = Control.CreateTyped(20);
        var target = Control.CreateTyped(0);
        var editor = new ControlEditor();

        Control.MakeComputed(target, tracker =>
        {
            var valA = tracker.Tracked(a).Value;
            var valB = tracker.Tracked(b).Value;
            return valA + valB;
        }, editor);

        Assert.Equal(30, target.Value);

        editor.SetValue(a, 15);
        Assert.Equal(35, target.Value);

        editor.SetValue(b, 25);
        Assert.Equal(40, target.Value);
    }

    [Fact]
    public void MakeComputed_Should_Allow_Overriding_Structured_Fields()
    {
        var userType = Control.CreateTyped("admin");
        var editor = new ControlEditor();

        var formState = Control.CreateStructured(new
        {
            Visible = true,
            Readonly = false,
            Message = ""
        });

        var readonlyField = formState.Field(x => x.Readonly);
        var messageField = formState.Field(x => x.Message);

        // Make readonly computed based on user type
        Control.MakeComputed(readonlyField, tracker =>
        {
            var type = tracker.Tracked(userType).Value;
            return type == "viewer";
        }, editor);

        // Make message computed based on readonly state
        Control.MakeComputed(messageField, tracker =>
        {
            var isReadonly = tracker.Tracked(readonlyField).Value;
            return isReadonly ? "Read-only mode" : "Edit mode";
        }, editor);

        Assert.False(readonlyField.Value);
        Assert.Equal("Edit mode", messageField.Value);

        editor.SetValue(userType, "viewer");
        Assert.True(readonlyField.Value);
        Assert.Equal("Read-only mode", messageField.Value);
    }
}
