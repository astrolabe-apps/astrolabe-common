using Astrolabe.Controls;
using FsCheck.Xunit;
using Xunit;

namespace Astrolabe.Common.Tests.Controls;

public class TransactionProperties
{
    /// <summary>
    /// Test that grouped updates prevent multiple events similar to test in object.test.ts
    /// </summary>
    [Property]
    public void GroupedUpdatesPreventMultipleEvents(string v1, string v2)
    {
        // Skip if values are the same
        if (v1 == v2)
            return;

        var ctx = ControlContext.Create();
        var control = ControlFactory.Create(new Dictionary<string, string> { ["v"] = v1 });
            
        // Track changes
        List<ControlChange> changes = new List<ControlChange>();
        var subscription = control.Subscribe((ctrl, change) => 
        {
            if ((change & (ControlChange.Value | ControlChange.Dirty)) != 0)
                changes.Add(change);
        }, ControlChange.Value | ControlChange.Dirty);
            
        // Make grouped changes
        ctx.InTransaction(() => {
            // Change value
            ctx.SetValue(control["v"], v2);
                
            // Change back to original
            ctx.SetValue(control["v"], v1);
        });
            
        // Verify only one change notification
        Assert.Single(changes);
            
        // Verify control is not dirty
        Assert.False(control.Dirty);
            
        // Clean up subscription
        control.Unsubscribe(subscription);
    }

    /// <summary>
    /// Test changing disabled updates subscriptions
    /// </summary>
    [Property]
    public void ChangingDisabledUpdatesSubscriptions(string childValue)
    {
        var ctx = ControlContext.Create();
        var control = ControlFactory.Create(childValue);
            
        // Track changes
        List<ControlChange> changes = new List<ControlChange>();
        var subscription = control.Subscribe((ctrl, change) => 
        {
            if ((change & ControlChange.Disabled) != 0)
                changes.Add(ControlChange.Disabled);
        }, ControlChange.Disabled);
            
        // Change disabled state multiple times
        ctx.SetDisabled(control, true);
        ctx.SetDisabled(control, false);
        ctx.SetDisabled(control, true);
            
        // Verify all changes were tracked
        Assert.Equal(3, changes.Count);
        Assert.All(changes, change => Assert.Equal(ControlChange.Disabled, change));
            
        // Clean up subscription
        control.Unsubscribe(subscription);
    }

    /// <summary>
    /// Test MarkAsClean sets a control to be not dirty
    /// </summary>
    [Property]
    public void MarkAsCleanResetsDirtyState(string initialValue, string modifiedValue)
    {
        // Skip if values are the same
        if (initialValue == modifiedValue)
            return;

        var ctx = ControlContext.Create();
        var control = ControlFactory.Create(initialValue);
            
        // Modify value to make dirty
        ctx.SetValue(control, modifiedValue);
            
        // Verify control is dirty
        Assert.True(control.Dirty);
            
        // Mark as clean
        ctx.MarkAsClean<object>(control);
            
        // Verify control is not dirty
        Assert.False(control.Dirty);
            
        // Verify initial value was updated
        Assert.Equal(modifiedValue, control.InitialValue);
    }

    /// <summary>
    /// Test transactions with callbacks
    /// </summary>
    [Property]
    public void TransactionsWithCallbacks(string initialValue, string modifiedValue)
    {
        // Skip if values are the same
        if (initialValue == modifiedValue)
            return;

        var ctx = ControlContext.Create();
        var control = ControlFactory.Create(initialValue);
            
        // Track callback execution
        bool callbackExecuted = false;
            
        // Add callback
        ctx.AddAfterChangesCallback(() => {
            callbackExecuted = true;
        });
            
        // Make change inside transaction
        ctx.InTransaction(() => {
            ctx.SetValue(control, modifiedValue);
                
            // Callback should not be executed within transaction
            Assert.False(callbackExecuted);
        });
            
        // Callback should be executed after transaction completes
        Assert.True(callbackExecuted);
    }

    /// <summary>
    /// Test nested transactions coalesce notifications
    /// </summary>
    [Property]
    public void NestedTransactionsCoalesceNotifications(string initialValue)
    {
        var ctx = ControlContext.Create();
        var control = ControlFactory.Create(initialValue);
            
        // Track changes
        List<ControlChange> changes = new List<ControlChange>();
        var subscription = control.Subscribe((ctrl, change) => 
        {
            if ((change & ControlChange.Value) != 0)
                changes.Add(ControlChange.Value);
        }, ControlChange.Value);
            
        // Make nested transactions
        ctx.InTransaction(() => {
            ctx.SetValue(control, initialValue + "a");
                
            ctx.InTransaction(() => {
                ctx.SetValue(control, initialValue + "b");
                    
                ctx.InTransaction(() => {
                    ctx.SetValue(control, initialValue + "c");
                });
            });
                
            // Should be no notifications yet
            Assert.Empty(changes);
        });
            
        // Should be exactly one notification for all changes
        Assert.Single(changes);
            
        // Clean up subscription
        control.Unsubscribe(subscription);
    }
}