using Astrolabe.Controls;
using Xunit;

namespace Astrolabe.Common.Tests;

public class ChildControlSubscriptionTest
{
    [Fact]
    public void Child_Control_Subscriptions_Should_Fire_When_Parent_Updated()
    {
        var parentControl = Control.Create(new Dictionary<string, object>
        {
            ["field1"] = "initial1"
        });
        
        var editor = new ControlEditor();
        var childControl = parentControl["field1"];
        Assert.NotNull(childControl);
        
        var childNotificationFired = false;
        
        childControl.Subscribe((ctrl, change, editor) => 
        {
            childNotificationFired = true;
        }, ControlChange.Value);

        // Update parent - this should internally update child
        editor.SetValue(parentControl, new Dictionary<string, object>
        {
            ["field1"] = "changed1"
        });
        
        Assert.True(childNotificationFired, "Child notification should fire when parent updates child internally");
        Assert.Equal("changed1", childControl.Value);
    }

    [Fact]
    public void Array_Element_Subscriptions_Should_Fire_When_Parent_Updated()
    {
        var parentControl = Control.Create(new List<object> { "item1", "item2" });
        var editor = new ControlEditor();
        var elementControl = parentControl[1];
        Assert.NotNull(elementControl);
        
        var elementNotificationFired = false;
        
        elementControl.Subscribe((ctrl, change, editor) => 
        {
            elementNotificationFired = true;
        }, ControlChange.Value);

        editor.SetValue(parentControl, new List<object> { "item1", "changed_item2" });
        
        Assert.True(elementNotificationFired, "Element notification should fire when parent updates element internally");
        Assert.Equal("changed_item2", elementControl.Value);
    }
}