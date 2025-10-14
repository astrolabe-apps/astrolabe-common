using Astrolabe.Controls;
using Xunit;

namespace Astrolabe.Common.Tests;

public class ImmutabilityAndEqualityTests
{
    [Fact]
    public void IsEqual_Should_Compare_Dictionaries_Deeply()
    {
        var dict1 = new Dictionary<string, object> { ["Name"] = "John", ["Age"] = 30 };
        var dict2 = new Dictionary<string, object> { ["Name"] = "John", ["Age"] = 30 };
        var dict3 = new Dictionary<string, object> { ["Name"] = "Jane", ["Age"] = 30 };

        Assert.True(IControl.IsEqual(dict1, dict2));
        Assert.False(IControl.IsEqual(dict1, dict3));
    }

    [Fact]
    public void IsEqual_Should_Compare_Arrays_Deeply()
    {
        var list1 = new List<object> { 1, "two", 3.0 };
        var list2 = new List<object> { 1, "two", 3.0 };
        var list3 = new List<object> { 1, "two", 4.0 };

        Assert.True(IControl.IsEqual(list1, list2));
        Assert.False(IControl.IsEqual(list1, list3));
    }

    [Fact]
    public void IsEqual_Should_Compare_Nested_Structures_Deeply()
    {
        var nested1 = new Dictionary<string, object>
        {
            ["Person"] = new Dictionary<string, object> { ["Name"] = "John", ["Age"] = 30 },
            ["Items"] = new List<object> { "item1", "item2" }
        };

        var nested2 = new Dictionary<string, object>
        {
            ["Person"] = new Dictionary<string, object> { ["Name"] = "John", ["Age"] = 30 },
            ["Items"] = new List<object> { "item1", "item2" }
        };

        var nested3 = new Dictionary<string, object>
        {
            ["Person"] = new Dictionary<string, object> { ["Name"] = "Jane", ["Age"] = 30 },
            ["Items"] = new List<object> { "item1", "item2" }
        };

        Assert.True(IControl.IsEqual(nested1, nested2));
        Assert.False(IControl.IsEqual(nested1, nested3));
    }

    [Fact]
    public void IsEqual_Should_Handle_Null_Values()
    {
        Assert.True(IControl.IsEqual(null, null));
        Assert.False(IControl.IsEqual(null, "value"));
        Assert.False(IControl.IsEqual("value", null));
    }

    [Fact]
    public void IsEqual_Should_Handle_Reference_Equality()
    {
        var dict = new Dictionary<string, object> { ["Name"] = "John" };
        Assert.True(IControl.IsEqual(dict, dict));
    }

    [Fact]
    public void Value_Should_Be_Immutable_When_Accessed()
    {
        var originalDict = new Dictionary<string, object> { ["Name"] = "John" };
        var control = Control.Create(originalDict);

        // First access to Value should return a reference to the value
        var value1 = control.Value;
        var value2 = control.Value;

        // Should return the same reference (not cloned) since no mutations needed
        Assert.Same(value1, value2);
        Assert.Equal("John", ((IDictionary<string, object>)value1!)["Name"]);
    }

    [Fact]
    public void InitialValue_Should_Be_Immutable_When_Accessed()
    {
        var originalDict = new Dictionary<string, object> { ["Name"] = "John" };
        var control = Control.Create(originalDict, originalDict, ControlFlags.None);

        // First access to InitialValue should return a reference to the value
        var initialValue1 = control.InitialValue;
        var initialValue2 = control.InitialValue;

        // Should return the same reference (not cloned) since no mutations needed
        Assert.Same(initialValue1, initialValue2);
        Assert.Equal("John", ((IDictionary<string, object>)initialValue1!)["Name"]);
    }

    [Fact]
    public void Value_Should_Clone_When_Needs_Internal_Mutation()
    {
        var dict = new Dictionary<string, object> { ["Name"] = "John" };
        var control = Control.Create(dict, dict, ControlFlags.None);
        var editor = new ControlEditor();

        // Access Value first - should return original reference
        var originalValue = control.Value;
        Assert.Same(dict, originalValue);

        // Get child and modify it - this should trigger cloning
        var child = control["Name"];
        Assert.NotNull(child);
        editor.SetValue(child, "Jane");

        // Now Value should return a different (cloned) reference
        var clonedValue = control.Value;
        Assert.NotSame(dict, clonedValue); // Different reference
        Assert.Equal("Jane", ((IDictionary<string, object>)clonedValue)["Name"]);

        // Original dict should be unmodified
        Assert.Equal("John", dict["Name"]);
    }

    [Fact]
    public void Child_Should_Inherit_Correct_Initial_Value_From_Parent()
    {
        var initialDict = new Dictionary<string, object> { ["Name"] = "John", ["Age"] = 30 };
        var currentDict = new Dictionary<string, object> { ["Name"] = "Jane", ["Age"] = 35 };
        var control = Control.Create(currentDict, initialDict, ControlFlags.None);

        var nameChild = control["Name"];
        var ageChild = control["Age"];

        Assert.NotNull(nameChild);
        Assert.NotNull(ageChild);

        // Current values
        Assert.Equal("Jane", nameChild.Value);
        Assert.Equal(35, ageChild.Value);

        // Initial values should come from parent's initial value
        Assert.Equal("John", nameChild.InitialValue);
        Assert.Equal(30, ageChild.InitialValue);

        // Children should be dirty
        Assert.True(nameChild.IsDirty);
        Assert.True(ageChild.IsDirty);
    }

    [Fact]
    public void Array_Child_Should_Inherit_Correct_Initial_Value_From_Parent()
    {
        var initialArray = new List<object> { "initial1", "initial2" };
        var currentArray = new List<object> { "current1", "current2" };
        var control = Control.Create(currentArray, initialArray, ControlFlags.None);

        var elements = control.Elements;
        Assert.Equal(2, elements.Count);

        // Current values
        Assert.Equal("current1", elements[0].Value);
        Assert.Equal("current2", elements[1].Value);

        // Initial values should come from parent's initial array
        Assert.Equal("initial1", elements[0].InitialValue);
        Assert.Equal("initial2", elements[1].InitialValue);

        // Children should be dirty
        Assert.True(elements[0].IsDirty);
        Assert.True(elements[1].IsDirty);
    }

    [Fact]
    public void Child_Initial_Value_Should_Default_To_Current_Value_If_Parent_Initial_Missing()
    {
        var initialDict = new Dictionary<string, object> { ["Name"] = "John" }; // Missing Age
        var currentDict = new Dictionary<string, object> { ["Name"] = "Jane", ["Age"] = 35 };
        var control = Control.Create(currentDict, initialDict, ControlFlags.None);

        var nameChild = control["Name"];
        var ageChild = control["Age"];

        Assert.NotNull(nameChild);
        Assert.NotNull(ageChild);

        // Name has initial value from parent
        Assert.Equal("Jane", nameChild.Value);
        Assert.Equal("John", nameChild.InitialValue);
        Assert.True(nameChild.IsDirty);

        // Age defaults to current value (no initial value in parent)
        Assert.Equal(35, ageChild.Value);
        Assert.Equal(35, ageChild.InitialValue);
        Assert.False(ageChild.IsDirty);
    }

    [Fact]
    public void SetInitialValue_Should_Propagate_To_Children()
    {
        var dict = new Dictionary<string, object> { ["Name"] = "John", ["Age"] = 30 };
        var control = Control.Create(dict);
        var editor = new ControlEditor();

        var nameChild = control["Name"];
        var ageChild = control["Age"];
        Assert.NotNull(nameChild);
        Assert.NotNull(ageChild);

        // Initially not dirty
        Assert.False(nameChild.IsDirty);
        Assert.False(ageChild.IsDirty);

        // Change some child values
        editor.SetValue(nameChild, "Jane");
        editor.SetValue(ageChild, 35);
        Assert.True(nameChild.IsDirty);
        Assert.True(ageChild.IsDirty);

        // Set parent initial value to match current values
        var newInitialDict = new Dictionary<string, object> { ["Name"] = "Jane", ["Age"] = 35 };
        editor.SetInitialValue(control, newInitialDict);

        // Children should now have updated initial values and not be dirty
        Assert.False(nameChild.IsDirty);
        Assert.False(ageChild.IsDirty);
        Assert.Equal("Jane", nameChild.InitialValue);
        Assert.Equal(35, ageChild.InitialValue);
    }

    [Fact]
    public void SetInitialValue_Should_Propagate_To_Array_Children()
    {
        var list = new List<object> { "first", "second" };
        var control = Control.Create(list);
        var editor = new ControlEditor();

        var elements = control.Elements;
        Assert.Equal(2, elements.Count);

        // Change element values
        editor.SetValue(elements[0], "changed1");
        editor.SetValue(elements[1], "changed2");
        Assert.True(elements[0].IsDirty);
        Assert.True(elements[1].IsDirty);

        // Set parent initial value to match current values
        var newInitialList = new List<object> { "changed1", "changed2" };
        editor.SetInitialValue(control, newInitialList);

        // Elements should now have updated initial values and not be dirty
        Assert.False(elements[0].IsDirty);
        Assert.False(elements[1].IsDirty);
        Assert.Equal("changed1", elements[0].InitialValue);
        Assert.Equal("changed2", elements[1].InitialValue);
    }
}