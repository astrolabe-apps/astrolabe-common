using Astrolabe.Controls;
using FsCheck.Xunit;
using Xunit;

namespace Astrolabe.Common.Tests.Controls;

public class EffectProperties
{
    /// <summary>
    /// Test that an effect captures changes in a control similar to effect.test.ts
    /// </summary>
    [Property]
    public void EffectCapturesControlChanges(string initialValue)
    {
        var control = ControlFactory.Create(initialValue);
        var ctx = ControlContext.Create();
            
        // Track effect runs
        var effectRuns = new List<ControlInfo>();
            
        // Create an effect (subscription)
        var subscription = control.Subscribe(
            (c, change) => {
                effectRuns.Add(new ControlInfo
                {
                    Value = c.Value?.ToString(),
                    Disabled = c.Disabled,
                    Touched = c.Touched,
                    Valid = c.Valid,
                    Error = c.Error
                });
            },
            ControlChange.All
        );
            
        // Initial state captured by effect
        Assert.Single(effectRuns);
        Assert.Equal(initialValue, effectRuns[0].Value);
        Assert.True(effectRuns[0].Valid);
        Assert.False(effectRuns[0].Touched);
        Assert.False(effectRuns[0].Disabled);
        Assert.Null(effectRuns[0].Error);
            
        // Make changes
        var modifiedValue = initialValue + "a";
        ctx.SetValue(control, modifiedValue);
        ctx.SetDisabled(control, true);
        ctx.SetTouched(control, true);
        ctx.SetError(control, "test", "Error message");
            
        // Verify effect captured each change
        Assert.Equal(5, effectRuns.Count); // Initial + 4 changes
            
        // Verify final state
        var finalState = effectRuns[effectRuns.Count - 1];
        Assert.Equal(modifiedValue, finalState.Value);
        Assert.True(finalState.Disabled);
        Assert.True(finalState.Touched);
        Assert.False(finalState.Valid);
        Assert.Equal("Error message", finalState.Error);
            
        // Clean up with transaction that makes multiple changes
        ctx.InTransaction(() => {
            ctx.ClearErrors(control);
            ctx.SetTouched(control, false);
            ctx.SetDisabled(control, false);
            ctx.SetValue(control, initialValue);
        });
            
        // Should have one more effect run with all changes
        Assert.Equal(6, effectRuns.Count);
        var resetState = effectRuns[effectRuns.Count - 1];
        Assert.Equal(initialValue, resetState.Value);
        Assert.False(resetState.Disabled);
        Assert.False(resetState.Touched);
        Assert.True(resetState.Valid);
        Assert.Null(resetState.Error);
            
        // Clean up subscription
        control.Unsubscribe(subscription);
    }
        
    /// <summary>
    /// Test that an effect captures changes in multiple controls similar to effect.test.ts
    /// </summary>
    [Property]
    public void EffectCapturesMultipleControlChanges(string value1, string value2)
    {
        var control1 = ControlFactory.Create(value1);
        var control2 = ControlFactory.Create(value2);
        var ctx = ControlContext.Create();
            
        // Track changes from both controls
        var effectRuns = new List<(string Value1, string Value2)>();
            
        // Create different effect tracking functions for each control
        var tracker = new MultiControlTracker(control1, control2, 
            (v1, v2) => effectRuns.Add((v1?.ToString() ?? "", v2?.ToString() ?? "")));
                
        // Verify initial state
        Assert.Single(effectRuns);
        Assert.Equal(value1, effectRuns[0].Value1);
        Assert.Equal(value2, effectRuns[0].Value2);
            
        // Change control 1
        ctx.SetValue(control1, value1 + "a");
            
        // Verify effect captured change
        Assert.Equal(2, effectRuns.Count);
        Assert.Equal(value1 + "a", effectRuns[1].Value1);
        Assert.Equal(value2, effectRuns[1].Value2);
            
        // Change control 2
        ctx.SetValue(control2, value2 + "b");
            
        // Verify effect captured change
        Assert.Equal(3, effectRuns.Count);
        Assert.Equal(value1 + "a", effectRuns[2].Value1);
        Assert.Equal(value2 + "b", effectRuns[2].Value2);
            
        // Change both in a transaction
        ctx.InTransaction(() => {
            ctx.SetValue(control1, value1);
            ctx.SetValue(control2, value2);
        });
            
        // Verify effect captured the transaction as a single change
        Assert.Equal(4, effectRuns.Count);
        Assert.Equal(value1, effectRuns[3].Value1);
        Assert.Equal(value2, effectRuns[3].Value2);
            
        // Clean up
        tracker.Cleanup();
    }
        
    /// <summary>
    /// Test that effect subscriptions are removed on cleanup
    /// </summary>
    [Property]
    public void SubscriptionsAreRemovedOnCleanup(string initialValue)
    {
        var control = ControlFactory.Create(initialValue);
        var ctx = ControlContext.Create();
            
        // Track effect runs
        var effectRuns = new List<string>();
            
        // Create subscription
        var subscription = control.Subscribe(
            (c, change) => {
                if ((change & ControlChange.Value) != 0)
                    effectRuns.Add(c.Value?.ToString() ?? "");
            },
            ControlChange.Value
        );
            
        // Make a change
        ctx.SetValue(control, initialValue + "a");
            
        // Verify effect captured change
        Assert.Equal(2, effectRuns.Count); // Initial + 1 change
        Assert.Equal(initialValue, effectRuns[0]);
        Assert.Equal(initialValue + "a", effectRuns[1]);
            
        // Clean up subscription
        control.Unsubscribe(subscription);
            
        // Make another change
        ctx.SetValue(control, initialValue + "b");
            
        // No new effect runs should be recorded
        Assert.Equal(2, effectRuns.Count);
    }
        
    // Helper class for tracking control info
    private class ControlInfo
    {
        public string Value { get; set; }
        public bool Disabled { get; set; }
        public bool Touched { get; set; }
        public bool Valid { get; set; }
        public string Error { get; set; }
    }
        
    // Helper class for multi-control tracking
    private class MultiControlTracker
    {
        private readonly IControl _control1;
        private readonly IControl _control2;
        private readonly Action<object, object> _onEffect;
        private readonly ISubscription _subscription1;
        private readonly ISubscription _subscription2;
            
        public MultiControlTracker(IControl control1, IControl control2, Action<object, object> onEffect)
        {
            _control1 = control1;
            _control2 = control2;
            _onEffect = onEffect;
                
            // Initial run
            _onEffect(control1.Value, control2.Value);
                
            // Subscribe to both controls
            _subscription1 = control1.Subscribe((c, change) => RunEffect(), ControlChange.Value);
            _subscription2 = control2.Subscribe((c, change) => RunEffect(), ControlChange.Value);
        }
            
        private void RunEffect()
        {
            _onEffect(_control1.Value, _control2.Value);
        }
            
        public void Cleanup()
        {
            _control1.Unsubscribe(_subscription1);
            _control2.Unsubscribe(_subscription2);
        }
    }
}