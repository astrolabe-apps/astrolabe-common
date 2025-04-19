using Astrolabe.Controls;
using FsCheck.Xunit;
using Xunit;

namespace Astrolabe.Common.Tests.Controls;

public class ObjectMutationProperties
{
    /// <summary>
    /// Test that values never get mutated (object) similar to object.test.ts
    /// </summary>
    [Property]
    public void ValuesNeverGetMutatedObject(string key, string childValue)
    {
        if (string.IsNullOrEmpty(key))
            return;

        var ctx = ControlContext.Create();
        var originalObj = new Dictionary<string, object?> { [key] = childValue };

        // Create a deep copy of the original object
        var originalObjCopy = new Dictionary<string, object?>(originalObj);

        // Create control with the original object
        var control = ControlFactory.Create(originalObj);

        // Get the value reference
        var controlValue = control.Value;

        // Modify the child through the control
        ctx.SetValue(control[key], childValue + "a");
        ctx.SetValue(control[key], childValue + "b");

        // Original object and control value should be unmodified
        Assert.Equal(childValue, originalObj[key]);

        // Compare the original retrieved value to the original object
        Assert.Equal(originalObjCopy[key], ((IDictionary<string, object>)controlValue)[key]);

        // Get the current value and verify it reflects changes
        var currentValue = control.Value;
        Assert.Equal(childValue + "b", ((IDictionary<string, object>)currentValue)[key]);
    }

    /// <summary>
    /// Test that values never get mutated (array) similar to object.test.ts
    /// </summary>
    [Property]
    public void ValuesNeverGetMutatedArray(List<string> stringArray)
    {
        if (stringArray.Count == 0)
            return;

        var ctx = ControlContext.Create();

        // Make a copy of the original array
        var originalArrayCopy = stringArray.ToList();

        // Create a control with the array
        var control = ControlFactory.Create(stringArray);

        // Get the value reference
        var controlValue = control.Value;

        // Modify an element through the control
        var modifiedValue = stringArray[0] + "a";
        ctx.SetValue(control.Elements[0], modifiedValue);

        // Original array should be unchanged
        Assert.Equal(originalArrayCopy[0], stringArray[0]);

        // The reference stored in controlValue should also be unmodified
        Assert.Equal(originalArrayCopy[0], ((IList<object>)controlValue)[0]);

        // Current control value should reflect the change
        Assert.Equal(modifiedValue, ((IList<object>)control.Value)[0]);
    }

    /// <summary>
    /// Test updating child fields of null parent makes parent not null
    /// </summary>
    [Property]
    public void UpdatingChildFieldsOfNullParentMakesParentNotNull(string childValue)
    {
        var ctx = ControlContext.Create();

        // Create a control with null initial value
        var control = ControlFactory.Create(null);

        // Verify changes are tracked
        List<ControlChange> changes = new List<ControlChange>();
        var subscription = control.Subscribe(
            (ctrl, change) =>
            {
                changes.Add(ControlChange.Value);
            },
            ControlChange.Value
        );

        // Access child field and set value
        var child = control["child"];
        ctx.SetValue(child, childValue);

        // Verify parent now has a value
        Assert.NotNull(control.Value);
        var dictValue = control.Value as IDictionary<string, object>;
        Assert.NotNull(dictValue);
        Assert.Equal(childValue, dictValue["child"]);

        // Verify changes were tracked
        Assert.Single(changes);
        Assert.Equal(ControlChange.Value, changes[0]);

        // Clean up subscription
        control.Unsubscribe(subscription);
    }

    /// <summary>
    /// Test updating parent to null makes child fields undefined
    /// </summary>
    [Property]
    public void UpdatingParentToNullMakesChildFieldsUndefined(string childValue)
    {
        var ctx = ControlContext.Create();

        // Create a control with an object containing a child
        var control = ControlFactory.Create(
            new Dictionary<string, string> { ["child"] = childValue }
        );
        var child = control["child"];

        // Verify changes are tracked
        List<ControlChange> changes = new List<ControlChange>();
        List<ControlChange> childChanges = new List<ControlChange>();
        var subscription = control.Subscribe(
            (ctrl, change) => changes.Add(ControlChange.Value),
            ControlChange.Value
        );

        // Modify child
        var modifiedValue = childValue + "a";
        ctx.SetValue(child, modifiedValue);

        // Track child changes
        var childSubscription = child.Subscribe(
            (ctrl, change) => childChanges.Add(ControlChange.Value),
            ControlChange.Value
        );

        // Set parent to null
        ctx.SetValue(control, null);

        // Verify child value is undefined
        Assert.Null(child.Value);

        // Modify child after parent is null
        ctx.SetValue(child, childValue + "b");

        // Set parent to object with different value
        ctx.SetValue(control, new Dictionary<string, object?> { ["child"] = childValue });

        // Verify parent value reflects new value
        Assert.Equal(childValue, ((IDictionary<string, object?>)control.Value)["child"]);

        // Verify changes were tracked
        Assert.Equal(4, changes.Count);
        Assert.Equal(3, childChanges.Count);

        // Clean up subscriptions
        control.Unsubscribe(subscription);
        child.Unsubscribe(childSubscription);
    }

    /// <summary>
    /// Test structure changes get notified
    /// </summary>
    [Property]
    public void StructureChangesGetNotified(double num)
    {
        var ctx = ControlContext.Create();

        // Create a control with an object containing a number
        var control = ControlFactory.Create(new Dictionary<string, double> { ["num"] = num });

        // Verify structure changes are tracked
        List<ControlChange> changes = new List<ControlChange>();
        var subscription = control.Subscribe(
            (ctrl, change) =>
            {
                if ((change & ControlChange.Structure) != 0)
                    changes.Add(ControlChange.Structure);
            },
            ControlChange.Structure
        );

        // Set to null
        ctx.SetValue(control, null);

        // Set back to object
        ctx.SetValue(control, new Dictionary<string, double> { ["num"] = num });

        // Verify structure changes were tracked
        Assert.Equal(2, changes.Count);
        Assert.All(changes, change => Assert.Equal(ControlChange.Structure, change));

        // Clean up subscription
        control.Unsubscribe(subscription);
    }
}
