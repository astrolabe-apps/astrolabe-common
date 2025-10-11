using Astrolabe.Controls;
using Xunit;

namespace Astrolabe.Common.Tests;

public class ArrayObjectControlTests
{
    [Fact]
    public void Control_Should_Detect_Object_Type()
    {
        var dict = new Dictionary<string, object> { ["Name"] = "John", ["Age"] = 30 };
        var control = new Control(dict, dict);

        Assert.True(control.IsObject);
        Assert.False(control.IsArray);
        Assert.Equal(2, control.Count);
    }

    [Fact]
    public void Control_Should_Detect_Array_Type()
    {
        var list = new List<object> { 1, 2, 3, 4 };
        var control = new Control(list, list);

        Assert.True(control.IsArray);
        Assert.False(control.IsObject);
        Assert.Equal(4, control.Count);
    }

    [Fact]
    public void Control_Should_Not_Treat_String_As_Array()
    {
        var control = new Control("hello", "hello");

        Assert.False(control.IsArray);
        Assert.False(control.IsObject);
        Assert.Equal(0, control.Count);
    }

    [Fact]
    public void Control_Should_Return_Empty_For_Non_Collection_Types()
    {
        var control = new Control(42, 42);

        Assert.False(control.IsArray);
        Assert.False(control.IsObject);
        Assert.Equal(0, control.Count);
        Assert.Empty(control.FieldNames);
        Assert.Empty(control.Elements);
    }

    [Fact]
    public void Object_Indexer_Should_Return_Child_Control()
    {
        var dict = new Dictionary<string, object> { ["Name"] = "John", ["Age"] = 30 };
        var control = new Control(dict, dict);

        var nameControl = control["Name"];
        var ageControl = control["Age"];

        Assert.NotNull(nameControl);
        Assert.NotNull(ageControl);
        Assert.Equal("John", nameControl.Value);
        Assert.Equal(30, ageControl.Value);
    }

    [Fact]
    public void Object_Indexer_Should_Cache_Child_Controls()
    {
        var dict = new Dictionary<string, object> { ["Name"] = "John" };
        var control = new Control(dict, dict);

        var nameControl1 = control["Name"];
        var nameControl2 = control["Name"];

        Assert.Same(nameControl1, nameControl2);
    }

    [Fact]
    public void Array_Indexer_Should_Return_Child_Control()
    {
        var list = new List<object> { "first", "second", "third" };
        var control = new Control(list, list);

        var firstControl = control[0];
        var secondControl = control[1];

        Assert.NotNull(firstControl);
        Assert.NotNull(secondControl);
        Assert.Equal("first", firstControl.Value);
        Assert.Equal("second", secondControl.Value);
    }

    [Fact]
    public void Array_Indexer_Should_Return_Null_For_Out_Of_Bounds()
    {
        var list = new List<object> { "first" };
        var control = new Control(list, list);

        var negativeControl = control[-1];
        var tooLargeControl = control[5];

        Assert.Null(negativeControl);
        Assert.Null(tooLargeControl);
    }

    [Fact]
    public void FieldNames_Should_Return_Object_Keys()
    {
        var dict = new Dictionary<string, object>
        {
            ["Name"] = "John",
            ["Age"] = 30,
            ["Email"] = "john@example.com"
        };
        var control = new Control(dict, dict);

        var fieldNames = control.FieldNames.ToList();

        Assert.Equal(3, fieldNames.Count);
        Assert.Contains("Name", fieldNames);
        Assert.Contains("Age", fieldNames);
        Assert.Contains("Email", fieldNames);
    }

    [Fact]
    public void Elements_Should_Return_All_Array_Controls()
    {
        var list = new List<object> { "first", "second", "third" };
        var control = new Control(list, list);

        var elements = control.Elements;

        Assert.Equal(3, elements.Count);
        Assert.Equal("first", elements[0].Value);
        Assert.Equal("second", elements[1].Value);
        Assert.Equal("third", elements[2].Value);
    }

    [Fact]
    public void Child_Control_Should_Have_Parent_Reference()
    {
        var dict = new Dictionary<string, object> { ["Name"] = "John" };
        var parent = new Control(dict, dict);
        var editor = new ControlEditor();

        var child = parent["Name"];
        Assert.NotNull(child);

        // Change child value - should update parent's internal dictionary (not external)
        editor.SetValue(child, "Jane");

        // External dictionary should be protected from mutation
        Assert.Equal("John", dict["Name"]);
        // But parent's value should reflect the change
        Assert.Equal("Jane", ((IDictionary<string, object>)parent.Value!)["Name"]);
        Assert.Equal("Jane", parent["Name"]!.Value);
    }

    [Fact]
    public void Array_Child_Control_Should_Update_Parent_Array()
    {
        var list = new List<object> { "first", "second" };
        var parent = new Control(list, list);
        var editor = new ControlEditor();

        var child = parent[0];
        Assert.NotNull(child);

        // Change child value - should update parent's internal list (not external)
        editor.SetValue(child, "changed");

        // External list should be protected from mutation
        Assert.Equal("first", list[0]);
        // But parent's value should reflect the change
        Assert.Equal("changed", ((System.Collections.IList)parent.Value!)[0]);
        Assert.Equal("changed", parent[0]!.Value);
    }

    [Fact]
    public void SetField_Should_Update_Object_Property()
    {
        var dict = new Dictionary<string, object> { ["Name"] = "John" };
        var control = new Control(dict, dict);
        var editor = new ControlEditor();

        editor.SetField(control, "Name", "Jane");

        // External dictionary should be protected from mutation
        Assert.Equal("John", dict["Name"]);
        // But control's value should reflect the change
        Assert.Equal("Jane", ((IDictionary<string, object>)control.Value!)["Name"]);
        Assert.Equal("Jane", control["Name"]!.Value);
    }

    [Fact]
    public void SetElement_Should_Update_Array_Element()
    {
        var list = new List<object> { "first", "second" };
        var control = new Control(list, list);
        var editor = new ControlEditor();

        editor.SetElement(control, 0, "changed");

        // External list should be protected from mutation
        Assert.Equal("first", list[0]);
        // But control's value should reflect the change
        Assert.Equal("changed", ((System.Collections.IList)control.Value!)[0]);
        Assert.Equal("changed", control[0]!.Value);
    }

    [Fact]
    public void AddElement_Should_Add_To_Array()
    {
        var list = new List<object> { "first", "second" };
        var control = new Control(list, list);
        var editor = new ControlEditor();

        editor.AddElement(control, "third");

        // External list should remain unchanged (protected)
        Assert.Equal(2, list.Count);
        // But control's value should reflect the change
        Assert.Equal(3, ((System.Collections.IList)control.Value!).Count);
        Assert.Equal("third", ((System.Collections.IList)control.Value!)[2]);
        Assert.Equal(3, control.Elements.Count);
        Assert.Equal("third", control.Elements[2].Value);
    }

    [Fact]
    public void RemoveElement_Should_Remove_From_Array()
    {
        var list = new List<object> { "first", "second", "third" };
        var control = new Control(list, list);
        var editor = new ControlEditor();

        editor.RemoveElement(control, 1);

        // External list should remain unchanged (protected)
        Assert.Equal(3, list.Count);
        // But control's value should reflect the change
        Assert.Equal(2, ((System.Collections.IList)control.Value!).Count);
        Assert.Equal("first", ((System.Collections.IList)control.Value!)[0]);
        Assert.Equal("third", ((System.Collections.IList)control.Value!)[1]);
        Assert.Equal(2, control.Elements.Count);
    }

    [Fact]
    public void Child_Controls_Should_Be_Preserved_When_Parent_Value_Changes()
    {
        var dict1 = new Dictionary<string, object> { ["Name"] = "John" };
        var dict2 = new Dictionary<string, object> { ["Name"] = "Jane" };
        var control = new Control(dict1, dict1);
        var editor = new ControlEditor();

        var originalChild = control["Name"];
        Assert.NotNull(originalChild);
        Assert.Equal("John", originalChild.Value);

        // Change entire value
        editor.SetValue(control, dict2);

        var newChild = control["Name"];
        Assert.NotNull(newChild);
        Assert.Equal("Jane", newChild.Value);

        // Should be the same child control instance with updated value
        Assert.Same(originalChild, newChild);
    }

    [Fact]
    public void Control_Should_Track_Dirty_State_For_Child_Changes()
    {
        var dict = new Dictionary<string, object> { ["Name"] = "John" };
        var control = new Control(dict, dict);
        var editor = new ControlEditor();

        var child = control["Name"];
        Assert.NotNull(child);
        Assert.False(child.IsDirty);

        editor.SetValue(child, "Jane");

        Assert.True(child.IsDirty);
        Assert.Equal("John", child.InitialValue);
        Assert.Equal("Jane", child.Value);
    }

    [Fact]
    public void Nested_Objects_Should_Work()
    {
        var nested = new Dictionary<string, object>
        {
            ["Person"] = new Dictionary<string, object> { ["Name"] = "John", ["Age"] = 30 }
        };
        var control = new Control(nested, nested);

        var personControl = control["Person"];
        Assert.NotNull(personControl);
        Assert.True(personControl.IsObject);

        var nameControl = personControl["Name"];
        Assert.NotNull(nameControl);
        Assert.Equal("John", nameControl.Value);
    }

    [Fact]
    public void Nested_Arrays_Should_Work()
    {
        var nestedArrays = new List<object>
        {
            new List<object> { 1, 2, 3 },
            new List<object> { 4, 5, 6 }
        };
        var control = new Control(nestedArrays, nestedArrays);

        var firstArray = control[0];
        Assert.NotNull(firstArray);
        Assert.True(firstArray.IsArray);
        Assert.Equal(3, firstArray.Count);

        var firstElement = firstArray[0];
        Assert.NotNull(firstElement);
        Assert.Equal(1, firstElement.Value);
    }

    [Fact]
    public void Child_Controls_Should_Inherit_Parent_Disabled_State()
    {
        var dict = new Dictionary<string, object> { ["Name"] = "John" };
        var control = new Control(dict, dict, ControlFlags.Disabled);
        var editor = new ControlEditor();

        // Parent is disabled
        Assert.True(control.IsDisabled);

        // Child should inherit disabled state
        var child = control["Name"];
        Assert.NotNull(child);
        Assert.True(child.IsDisabled);
    }

    [Fact]
    public void Child_Controls_Should_Inherit_Parent_Touched_State()
    {
        var dict = new Dictionary<string, object> { ["Name"] = "John" };
        var control = new Control(dict, dict, ControlFlags.Touched);

        // Parent is touched
        Assert.True(control.IsTouched);

        // Child should inherit touched state
        var child = control["Name"];
        Assert.NotNull(child);
        Assert.True(child.IsTouched);
    }

    [Fact]
    public void SetDisabled_Should_Propagate_To_Child_Controls()
    {
        var dict = new Dictionary<string, object> { ["Name"] = "John", ["Age"] = 30 };
        var control = new Control(dict, dict);
        var editor = new ControlEditor();

        // Get child controls
        var nameChild = control["Name"];
        var ageChild = control["Age"];
        Assert.NotNull(nameChild);
        Assert.NotNull(ageChild);

        // Initially not disabled
        Assert.False(control.IsDisabled);
        Assert.False(nameChild.IsDisabled);
        Assert.False(ageChild.IsDisabled);

        // Set parent disabled
        editor.SetDisabled(control, true);

        // All should be disabled
        Assert.True(control.IsDisabled);
        Assert.True(nameChild.IsDisabled);
        Assert.True(ageChild.IsDisabled);
    }

    [Fact]
    public void SetTouched_Should_Propagate_To_Child_Controls()
    {
        var list = new List<object> { "first", "second", "third" };
        var control = new Control(list, list);
        var editor = new ControlEditor();

        // Get child controls
        var elements = control.Elements;
        Assert.Equal(3, elements.Count);

        // Initially not touched
        Assert.False(control.IsTouched);
        foreach (var element in elements)
        {
            Assert.False(element.IsTouched);
        }

        // Set parent touched
        editor.SetTouched(control, true);

        // All should be touched
        Assert.True(control.IsTouched);
        foreach (var element in elements)
        {
            Assert.True(element.IsTouched);
        }
    }

    [Fact]
    public void New_Child_Controls_Should_Inherit_Current_Parent_State()
    {
        var dict = new Dictionary<string, object> { ["Name"] = "John" };
        var control = new Control(dict, dict);
        var editor = new ControlEditor();

        // Set parent state first
        editor.SetDisabled(control, true);
        editor.SetTouched(control, true);

        // Add new field to dictionary
        var newDict = new Dictionary<string, object> { ["Name"] = "John", ["Age"] = 30 };
        editor.SetValue(control, newDict);

        // New child should inherit parent state
        var newChild = control["Age"];
        Assert.NotNull(newChild);
        Assert.True(newChild.IsDisabled);
        Assert.True(newChild.IsTouched);
    }

    [Fact]
    public void AddElement_Should_Fire_Structure_Change_Notification()
    {
        var list = new List<object> { "first", "second" };
        var control = new Control(list, list);
        var editor = new ControlEditor();
        var structureChangeCount = 0;
        ControlChange notifiedChange = ControlChange.None;

        control.Subscribe(
            (ctrl, change, ed) =>
            {
                structureChangeCount++;
                notifiedChange = change;
            },
            ControlChange.Structure
        );

        editor.AddElement(control, "third");

        // Should fire Structure notification
        Assert.Equal(1, structureChangeCount);
        Assert.True((notifiedChange & ControlChange.Structure) != 0);
        Assert.Equal(3, control.Elements.Count);
    }

    [Fact]
    public void RemoveElement_Should_Fire_Structure_Change_Notification()
    {
        var list = new List<object> { "first", "second", "third" };
        var control = new Control(list, list);
        var editor = new ControlEditor();
        var structureChangeCount = 0;
        ControlChange notifiedChange = ControlChange.None;

        control.Subscribe(
            (ctrl, change, ed) =>
            {
                structureChangeCount++;
                notifiedChange = change;
            },
            ControlChange.Structure
        );

        editor.RemoveElement(control, 1);

        // Should fire Structure notification
        Assert.Equal(1, structureChangeCount);
        Assert.True((notifiedChange & ControlChange.Structure) != 0);
        Assert.Equal(2, control.Elements.Count);
    }

    [Fact]
    public void Multiple_AddElement_Calls_Should_Fire_Structure_Notifications()
    {
        var list = new List<object> { "first" };
        var control = new Control(list, list);
        var editor = new ControlEditor();
        var structureChangeCount = 0;

        control.Subscribe(
            (ctrl, change, ed) =>
            {
                if ((change & ControlChange.Structure) != 0)
                {
                    structureChangeCount++;
                }
            },
            ControlChange.Structure
        );

        editor.AddElement(control, "second");
        Assert.Equal(1, structureChangeCount);

        editor.AddElement(control, "third");
        Assert.Equal(2, structureChangeCount);

        editor.AddElement(control, "fourth");
        Assert.Equal(3, structureChangeCount);

        Assert.Equal(4, control.Elements.Count);
    }

    [Fact]
    public void ChangeTracker_Should_Track_Structure_Changes()
    {
        var list = new List<object> { "first", "second" };
        var arrayControl = Control.Create(list);
        var computedControl = Control.CreateTyped<int>(0);
        var editor = new ControlEditor();
        var computeCallCount = 0;

        Control.MakeComputed(
            computedControl,
            tracker =>
            {
                computeCallCount++;
                var elements = tracker.TrackElements(arrayControl);
                return elements.Count;
            },
            editor
        );

        // Initial computation should happen
        Assert.Equal(1, computeCallCount);
        Assert.Equal(2, computedControl.Value);

        // Add element - should trigger recomputation via Structure change
        editor.AddElement(arrayControl, "third");
        Assert.Equal(2, computeCallCount);
        Assert.Equal(3, computedControl.Value);

        // Remove element - should trigger recomputation via Structure change
        editor.RemoveElement(arrayControl, 0);
        Assert.Equal(3, computeCallCount);
        Assert.Equal(2, computedControl.Value);
    }

    [Fact]
    public void Structure_Changes_Should_Batch_In_Transaction()
    {
        var list = new List<object> { "first" };
        var control = new Control(list, list);
        var editor = new ControlEditor();
        var structureChangeCount = 0;

        control.Subscribe(
            (ctrl, change, ed) =>
            {
                if ((change & ControlChange.Structure) != 0)
                {
                    structureChangeCount++;
                }
            },
            ControlChange.Structure
        );

        editor.RunInTransaction(() =>
        {
            editor.AddElement(control, "second");
            editor.AddElement(control, "third");
            editor.RemoveElement(control, 0);

            // No notifications yet (still in transaction)
            Assert.Equal(0, structureChangeCount);
        });

        // After transaction, only one notification (batched)
        Assert.Equal(1, structureChangeCount);
        Assert.Equal(2, control.Elements.Count);
    }

    [Fact]
    public void SetValue_Growing_Array_Should_Fire_Structure_Change()
    {
        var list = new List<object> { "item1", "item2" };
        var control = new Control(list, list);
        var editor = new ControlEditor();
        var structureChangeCount = 0;
        ControlChange notifiedChange = ControlChange.None;

        // Access Elements to ensure _elementControls is created
        var initialElements = control.Elements;
        Assert.Equal(2, initialElements.Count);

        control.Subscribe(
            (ctrl, change, ed) =>
            {
                if ((change & ControlChange.Structure) != 0)
                {
                    structureChangeCount++;
                    notifiedChange = change;
                }
            },
            ControlChange.Structure
        );

        // Grow array using SetValue
        var newList = new List<object> { "item1", "item2", "item3", "item4" };
        editor.SetValue(control, newList);

        // Should fire Structure notification
        Assert.Equal(1, structureChangeCount);
        Assert.True((notifiedChange & ControlChange.Structure) != 0);
        Assert.Equal(4, control.Elements.Count);
    }

    [Fact]
    public void SetValue_Shrinking_Array_Should_Fire_Structure_Change()
    {
        var list = new List<object> { "item1", "item2", "item3", "item4" };
        var control = new Control(list, list);
        var editor = new ControlEditor();
        var structureChangeCount = 0;
        ControlChange notifiedChange = ControlChange.None;

        // Access Elements to ensure _elementControls is created
        var initialElements = control.Elements;
        Assert.Equal(4, initialElements.Count);

        control.Subscribe(
            (ctrl, change, ed) =>
            {
                if ((change & ControlChange.Structure) != 0)
                {
                    structureChangeCount++;
                    notifiedChange = change;
                }
            },
            ControlChange.Structure
        );

        // Shrink array using SetValue
        var newList = new List<object> { "item1", "item2" };
        editor.SetValue(control, newList);

        // Should fire Structure notification
        Assert.Equal(1, structureChangeCount);
        Assert.True((notifiedChange & ControlChange.Structure) != 0);
        Assert.Equal(2, control.Elements.Count);
    }

    [Fact]
    public void SetValue_Same_Size_Array_Should_Not_Fire_Structure_Change()
    {
        var list = new List<object> { "item1", "item2" };
        var control = new Control(list, list);
        var editor = new ControlEditor();
        var structureChangeCount = 0;
        var valueChangeCount = 0;

        // Access Elements to ensure _elementControls is created
        var initialElements = control.Elements;
        Assert.Equal(2, initialElements.Count);

        control.Subscribe(
            (ctrl, change, ed) =>
            {
                if ((change & ControlChange.Structure) != 0)
                {
                    structureChangeCount++;
                }
            },
            ControlChange.Structure
        );

        control.Subscribe(
            (ctrl, change, ed) =>
            {
                if ((change & ControlChange.Value) != 0)
                {
                    valueChangeCount++;
                }
            },
            ControlChange.Value
        );

        // Change array with same size using SetValue
        var newList = new List<object> { "newItem1", "newItem2" };
        editor.SetValue(control, newList);

        // Should NOT fire Structure notification (same size)
        Assert.Equal(0, structureChangeCount);
        // But SHOULD fire Value notification
        Assert.Equal(1, valueChangeCount);
        Assert.Equal(2, control.Elements.Count);
        Assert.Equal("newItem1", control.Elements[0].Value);
        Assert.Equal("newItem2", control.Elements[1].Value);
    }

    [Fact]
    public void ChangeTracker_Should_Track_Structure_Changes_Via_SetValue()
    {
        var list = new List<object> { "first", "second" };
        var arrayControl = Control.Create(list);
        var computedControl = Control.CreateTyped<int>(0);
        var editor = new ControlEditor();
        var computeCallCount = 0;

        // Access Elements to ensure _elementControls is created
        var initialElements = arrayControl.Elements;

        Control.MakeComputed(
            computedControl,
            tracker =>
            {
                computeCallCount++;
                var elements = tracker.TrackElements(arrayControl);
                return elements.Count;
            },
            editor
        );

        // Initial computation should happen
        Assert.Equal(1, computeCallCount);
        Assert.Equal(2, computedControl.Value);

        // Grow array using SetValue - should trigger recomputation via Structure change
        editor.SetValue(arrayControl, new List<object> { "first", "second", "third" });
        Assert.Equal(2, computeCallCount);
        Assert.Equal(3, computedControl.Value);

        // Shrink array using SetValue - should trigger recomputation via Structure change
        editor.SetValue(arrayControl, new List<object> { "first" });
        Assert.Equal(3, computeCallCount);
        Assert.Equal(1, computedControl.Value);

        // Same size change - should NOT trigger recomputation (no Structure change)
        editor.SetValue(arrayControl, new List<object> { "changed" });
        Assert.Equal(3, computeCallCount); // No additional computation
        Assert.Equal(1, computedControl.Value);
    }
}
