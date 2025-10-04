using Astrolabe.Controls;
using Xunit;

namespace Astrolabe.Common.Tests;

public class UndefinedControlTests
{
    [Fact]
    public void Missing_Property_Should_Return_Undefined_Control()
    {
        var parentControl = Control.Create(new Dictionary<string, object>
        {
            ["existingField"] = "value"
        });

        var missingChild = parentControl["missingField"];
        
        Assert.NotNull(missingChild);
        Assert.True(missingChild.IsUndefined);
        Assert.Equal(UndefinedValue.Instance, missingChild.Value);
        Assert.Equal(UndefinedValue.Instance, missingChild.InitialValue);
    }

    [Fact]
    public void Undefined_Control_Should_Fire_Subscriptions()
    {
        var parentControl = Control.Create(new Dictionary<string, object>());
        var editor = new ControlEditor();
        var missingChild = parentControl["testField"];
        
        Assert.True(missingChild!.IsUndefined);
        
        var notificationFired = false;
        missingChild.Subscribe((ctrl, change, editor) => 
        {
            notificationFired = true;
        }, ControlChange.Value);

        // Setting value on undefined control should fire subscription
        editor.SetValue(missingChild, "now defined");
        
        Assert.True(notificationFired);
        Assert.False(missingChild.IsUndefined);
        Assert.Equal("now defined", missingChild.Value);
    }

    [Fact]
    public void Setting_Undefined_Value_Should_Remove_From_Parent_Dictionary()
    {
        var parentControl = Control.Create(new Dictionary<string, object>
        {
            ["field1"] = "value1",
            ["field2"] = "value2"
        });
        
        var editor = new ControlEditor();
        var child = parentControl["field1"];
        
        Assert.False(child!.IsUndefined);
        Assert.Equal("value1", child.Value);
        
        // Set child to undefined
        editor.SetValue(child, UndefinedValue.Instance);
        
        Assert.True(child.IsUndefined);
        
        // Parent dictionary should no longer contain the field
        var parentDict = (Dictionary<string, object>)parentControl.Value!;
        Assert.False(parentDict.ContainsKey("field1"));
        Assert.True(parentDict.ContainsKey("field2")); // Other fields unchanged
        Assert.Equal("value2", parentDict["field2"]);
    }

    [Fact]
    public void Parent_Update_Should_Make_Missing_Fields_Undefined()
    {
        var parentControl = Control.Create(new Dictionary<string, object>
        {
            ["field1"] = "value1",
            ["field2"] = "value2"
        });
        
        var editor = new ControlEditor();
        var child1 = parentControl["field1"];
        var child2 = parentControl["field2"];
        
        Assert.False(child1!.IsUndefined);
        Assert.False(child2!.IsUndefined);
        
        // Update parent to only have field2
        editor.SetValue(parentControl, new Dictionary<string, object>
        {
            ["field2"] = "updated value2"
        });
        
        // field1 child should now be undefined
        Assert.True(child1.IsUndefined);
        Assert.Equal(UndefinedValue.Instance, child1.Value);
        
        // field2 child should be updated but defined
        Assert.False(child2.IsUndefined);
        Assert.Equal("updated value2", child2.Value);
    }

    [Fact]
    public void Undefined_To_Defined_Transition_Should_Update_Parent()
    {
        var parentControl = Control.Create(new Dictionary<string, object>());
        var editor = new ControlEditor();
        var undefinedChild = parentControl["newField"];
        
        Assert.True(undefinedChild!.IsUndefined);
        
        // Parent dict should be empty
        var parentDict = (Dictionary<string, object>)parentControl.Value!;
        Assert.Empty(parentDict);
        
        // Set undefined child to a value
        editor.SetValue(undefinedChild, "new value");
        
        Assert.False(undefinedChild.IsUndefined);
        Assert.Equal("new value", undefinedChild.Value);
        
        // Refresh reference to parent dict as it may have been cloned
        parentDict = (Dictionary<string, object>)parentControl.Value!;
        
        // Parent dict should now contain the field
        Assert.Single(parentDict);
        Assert.True(parentDict.ContainsKey("newField"));
        Assert.Equal("new value", parentDict["newField"]);
    }

    [Fact]
    public void Undefined_Controls_Should_Inherit_Parent_State()
    {
        var parentControl = Control.Create(new Dictionary<string, object>());
        var editor = new ControlEditor();
        
        // Set parent as disabled and touched
        editor.SetDisabled(parentControl, true);
        editor.SetTouched(parentControl, true);
        
        var undefinedChild = parentControl["testField"];
        
        Assert.True(undefinedChild!.IsUndefined);
        Assert.True(undefinedChild.IsDisabled);
        Assert.True(undefinedChild.IsTouched);
    }

    [Fact]
    public void Undefined_Control_IsDirty_Should_Work_Correctly()
    {
        // Test undefined vs undefined (not dirty)
        var parentControl = Control.Create(new Dictionary<string, object>());
        var undefinedChild = parentControl["testField"];
        
        Assert.True(undefinedChild!.IsUndefined);
        Assert.False(undefinedChild.IsDirty); // undefined vs undefined = not dirty
        
        var editor = new ControlEditor();
        
        // Test undefined vs defined (dirty)
        editor.SetValue(undefinedChild, "defined");
        Assert.True(undefinedChild.IsDirty); // defined vs undefined initial = dirty
        
        // Test defined vs undefined (dirty)
        editor.SetInitialValue(undefinedChild, "defined");
        Assert.False(undefinedChild.IsDirty); // defined vs defined = not dirty
        
        editor.SetValue(undefinedChild, UndefinedValue.Instance);
        Assert.True(undefinedChild.IsDirty); // undefined vs defined initial = dirty
    }

    [Fact]
    public void UndefinedValue_Equality_Should_Work_Correctly()
    {
        // UndefinedValue should only equal itself
        Assert.True(IControl.IsEqual(UndefinedValue.Instance, UndefinedValue.Instance));
        Assert.False(IControl.IsEqual(UndefinedValue.Instance, null));
        Assert.False(IControl.IsEqual(UndefinedValue.Instance, "string"));
        Assert.False(IControl.IsEqual(UndefinedValue.Instance, 42));
        Assert.False(IControl.IsEqual(null, UndefinedValue.Instance));
        Assert.False(IControl.IsEqual("string", UndefinedValue.Instance));
    }

    [Fact]
    public void Cached_Undefined_Controls_Should_Be_Reused()
    {
        var parentControl = Control.Create(new Dictionary<string, object>());
        
        var child1 = parentControl["testField"];
        var child2 = parentControl["testField"];
        
        Assert.Same(child1, child2);
        Assert.True(child1!.IsUndefined);
        Assert.True(child2!.IsUndefined);
    }
}