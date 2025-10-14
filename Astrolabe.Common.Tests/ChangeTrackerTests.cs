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

        tracker.RecordAccess(control, ControlChange.Value);

        Assert.Equal("test", control.ValueObject);
    }

    [Fact]
    public void UpdateSubscriptions_Should_Subscribe_To_Accessed_Properties()
    {
        var tracker = new ChangeTracker();
        var control = Control.Create("initial");
        var callbackCount = 0;

        // Set up callback
        tracker.SetCallback(() => callbackCount++);

        // Access Value property
        tracker.RecordAccess(control, ControlChange.Value);
        _ = control.ValueObject;

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
        var callbackCount = 0;

        tracker.SetCallback(() => callbackCount++);

        // Access only Value, not IsDirty
        tracker.RecordAccess(control, ControlChange.Value);
        _ = control.ValueObject;

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
        var callbackCount = 0;

        tracker.SetCallback(() => {
            callbackCount++;
            tracker.RecordAccess(control, ControlChange.Value);
            _ = control.ValueObject;
            tracker.UpdateSubscriptions();
        });

        // Initial evaluation
        tracker.RecordAccess(control, ControlChange.Value);
        _ = control.ValueObject;
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
        var callbackCount = 0;

        tracker.SetCallback(() => callbackCount++);

        // Access multiple properties
        tracker.RecordAccess(control, ControlChange.Value | ControlChange.Dirty);
        _ = control.ValueObject;
        _ = control.IsDirty;

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
        tracker.RecordAccess(control1, ControlChange.Value);
        tracker.RecordAccess(control2, ControlChange.Value);
        _ = control1.ValueObject;
        _ = control2.ValueObject;

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
        tracker.RecordAccess(control1, ControlChange.Value);
        _ = control1.ValueObject;
        tracker.UpdateSubscriptions();

        // Second evaluation - track only control2
        tracker.RecordAccess(control2, ControlChange.Value);
        _ = control2.ValueObject;
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

        tracker.RecordAccess(control, ControlChange.Value);
        _ = control.ValueObject;
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
        var control = Control.Create("value", "initial", ControlFlags.Touched | ControlFlags.Disabled);
        var editor = new ControlEditor();
        editor.SetError(control, "test", "error");

        Assert.Equal("value", control.ValueObject);
        Assert.Equal("initial", control.InitialValueObject);
        Assert.True(control.IsDirty);
        Assert.True(control.IsDisabled);
        Assert.True(control.IsTouched);
        Assert.False(control.IsValid);
        Assert.Single(control.Errors);
        Assert.True(control.HasErrors);
        Assert.False(control.IsUndefined);
    }

    [Fact]
    public void Callback_Should_Only_Run_Once_Per_Transaction()
    {
        var tracker = new ChangeTracker();
        var control = Control.Create("initial");
        var callbackCount = 0;

        tracker.SetCallback(() => callbackCount++);

        tracker.RecordAccess(control, ControlChange.Value);
        _ = control.ValueObject;
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
        control.Subscribe((ctrl, change, editor) => {
            executionOrder.Add("listener");
        }, ControlChange.Value);

        // Set up tracker callback
        tracker.SetCallback(() => {
            executionOrder.Add("tracker-callback");
        });

        tracker.RecordAccess(control, ControlChange.Value);
        _ = control.ValueObject;
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
        tracker.RecordAccess(control1, ControlChange.Value);
        tracker.RecordAccess(control2, ControlChange.Value);
        _ = control1.ValueObject;
        _ = control2.ValueObject;
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
        tracker.RecordAccess(control, ControlChange.Value | ControlChange.Valid);
        _ = control.ValueObject;
        _ = control.ValueObject;
        _ = control.IsValid;

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
        var firstName = Control.Create("John");
        var lastName = Control.Create("Doe");
        var editor = new ControlEditor();

        var fullName = Control.CreateComputed(tracker =>
        {
            tracker.RecordAccess(firstName, ControlChange.Value);
            tracker.RecordAccess(lastName, ControlChange.Value);
            var first = (string)firstName.ValueObject!;
            var last = (string)lastName.ValueObject!;
            return $"{first} {last}";
        }, editor);

        Assert.Equal("John Doe", fullName.ValueObject);
    }

    [Fact]
    public void CreateComputed_Should_Update_When_Dependencies_Change()
    {
        var firstName = Control.Create("John");
        var lastName = Control.Create("Doe");
        var editor = new ControlEditor();

        var fullName = Control.CreateComputed(tracker =>
        {
            tracker.RecordAccess(firstName, ControlChange.Value);
            tracker.RecordAccess(lastName, ControlChange.Value);
            var first = (string)firstName.ValueObject!;
            var last = (string)lastName.ValueObject!;
            return $"{first} {last}";
        }, editor);

        Assert.Equal("John Doe", fullName.ValueObject);

        // Change first name
        editor.SetValue(firstName, "Jane");
        Assert.Equal("Jane Doe", fullName.ValueObject);

        // Change last name
        editor.SetValue(lastName, "Smith");
        Assert.Equal("Jane Smith", fullName.ValueObject);
    }

    [Fact]
    public void CreateComputed_Should_Track_Multiple_Properties()
    {
        var control = Control.Create("test");
        var editor = new ControlEditor();

        var computed = Control.CreateComputed(tracker =>
        {
            tracker.RecordAccess(control, ControlChange.Value | ControlChange.Dirty | ControlChange.Touched);
            return $"{control.ValueObject}:{control.IsDirty}:{control.IsTouched}";
        }, editor);

        Assert.Equal("test:False:False", computed.ValueObject);

        // Change value - affects both Value and IsDirty
        editor.SetValue(control, "changed");
        Assert.Equal("changed:True:False", computed.ValueObject);

        // Change touched
        editor.SetTouched(control, true);
        Assert.Equal("changed:True:True", computed.ValueObject);
    }

    [Fact]
    public void CreateComputed_Should_Work_With_Conditional_Dependencies()
    {
        var useFirstName = Control.Create(true);
        var firstName = Control.Create("John");
        var lastName = Control.Create("Doe");
        var editor = new ControlEditor();

        var displayName = Control.CreateComputed(tracker =>
        {
            tracker.RecordAccess(useFirstName, ControlChange.Value);
            var useFirst = (bool)useFirstName.ValueObject!;
            if (useFirst)
            {
                tracker.RecordAccess(firstName, ControlChange.Value);
                return (string)firstName.ValueObject!;
            }
            else
            {
                tracker.RecordAccess(lastName, ControlChange.Value);
                return (string)lastName.ValueObject!;
            }
        }, editor);

        Assert.Equal("John", displayName.ValueObject);

        // Changing lastName shouldn't trigger update (not tracked)
        editor.SetValue(lastName, "Smith");
        Assert.Equal("John", displayName.ValueObject);

        // Switch to using lastName
        editor.SetValue(useFirstName, false);
        Assert.Equal("Smith", displayName.ValueObject);

        // Now changing firstName shouldn't trigger update
        editor.SetValue(firstName, "Jane");
        Assert.Equal("Smith", displayName.ValueObject);

        // Changing lastName should trigger update now
        editor.SetValue(lastName, "Jones");
        Assert.Equal("Jones", displayName.ValueObject);
    }

    [Fact]
    public void CreateComputed_Should_Support_Chained_Computations()
    {
        var firstName = Control.Create("John");
        var lastName = Control.Create("Doe");
        var editor = new ControlEditor();

        var fullName = Control.CreateComputed(tracker =>
        {
            tracker.RecordAccess(firstName, ControlChange.Value);
            tracker.RecordAccess(lastName, ControlChange.Value);
            var first = (string)firstName.ValueObject!;
            var last = (string)lastName.ValueObject!;
            return $"{first} {last}";
        }, editor);

        var greeting = Control.CreateComputed(tracker =>
        {
            tracker.RecordAccess(fullName, ControlChange.Value);
            var name = (string)fullName.ValueObject!;
            return $"Hello, {name}!";
        }, editor);

        Assert.Equal("Hello, John Doe!", greeting.ValueObject);

        editor.SetValue(firstName, "Jane");
        Assert.Equal("Hello, Jane Doe!", greeting.ValueObject);
    }

    [Fact]
    public void MakeComputed_Should_Update_Existing_Control()
    {
        var firstName = Control.Create("John");
        var target = Control.Create("initial");
        var editor = new ControlEditor();

        // Make target computed based on firstName
        Control<object?>.MakeComputed(target, tracker =>
        {
            tracker.RecordAccess(firstName, ControlChange.Value);
            var name = (string)firstName.ValueObject!;
            return name.ToUpper();
        }, editor);

        Assert.Equal("JOHN", target.ValueObject);

        editor.SetValue(firstName, "Jane");
        Assert.Equal("JANE", target.ValueObject);
    }

    [Fact]
    public void MakeComputed_Should_Work_With_Structured_Control_Fields()
    {
        var condition = Control.Create(true);
        var editor = new ControlEditor();

        var baseCtrl = Control.CreateStructured(new { Visible = (bool?)null, Readonly = false });
        var visibleField = baseCtrl["Visible"];

        // Make the Visible field computed
        Control<object?>.MakeComputed(visibleField!, tracker =>
        {
            tracker.RecordAccess(condition, ControlChange.Value);
            var cond = (bool)condition.ValueObject!;
            return cond ? true : (bool?)null;
        }, editor);

        Assert.True((bool)visibleField!.ValueObject!);

        editor.SetValue(condition, false);
        Assert.Null(visibleField.ValueObject);
    }

    [Fact]
    public void MakeComputed_Should_Track_Multiple_Dependencies()
    {
        var a = Control.Create(10);
        var b = Control.Create(20);
        var target = Control.Create(0);
        var editor = new ControlEditor();

        Control<object?>.MakeComputed(target, tracker =>
        {
            tracker.RecordAccess(a, ControlChange.Value);
            tracker.RecordAccess(b, ControlChange.Value);
            var valA = (int)a.ValueObject!;
            var valB = (int)b.ValueObject!;
            return valA + valB;
        }, editor);

        Assert.Equal(30, target.ValueObject);

        editor.SetValue(a, 15);
        Assert.Equal(35, target.ValueObject);

        editor.SetValue(b, 25);
        Assert.Equal(40, target.ValueObject);
    }

    [Fact]
    public void MakeComputed_Should_Allow_Overriding_Structured_Fields()
    {
        var userType = Control.Create("admin");
        var editor = new ControlEditor();

        var formState = Control.CreateStructured(new
        {
            Visible = true,
            Readonly = false,
            Message = ""
        });

        var readonlyField = formState["Readonly"];
        var messageField = formState["Message"];

        // Make readonly computed based on user type
        Control<object?>.MakeComputed(readonlyField!, tracker =>
        {
            tracker.RecordAccess(userType, ControlChange.Value);
            var type = (string)userType.ValueObject!;
            return type == "viewer";
        }, editor);

        // Make message computed based on readonly state
        Control<object?>.MakeComputed(messageField!, tracker =>
        {
            tracker.RecordAccess(readonlyField!, ControlChange.Value);
            var isReadonly = (bool)readonlyField!.ValueObject!;
            return isReadonly ? "Read-only mode" : "Edit mode";
        }, editor);

        Assert.False((bool)readonlyField!.ValueObject!);
        Assert.Equal("Edit mode", messageField!.ValueObject);

        editor.SetValue(userType, "viewer");
        Assert.True((bool)readonlyField.ValueObject!);
        Assert.Equal("Read-only mode", messageField.ValueObject);
    }
}
