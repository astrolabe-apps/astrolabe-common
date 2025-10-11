using Astrolabe.Controls;
using Xunit;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;

namespace Astrolabe.Common.Tests;

public class ChildControlCleanupTests
{
    [Fact]
    public void Field_Controls_Should_Be_Cleared_On_Type_Change()
    {
        var objectData = new Dictionary<string, object> { ["name"] = "John", ["age"] = 30 };
        var control = Control.Create(objectData);
        var editor = new ControlEditor();

        // Create field children to populate _fieldControls cache
        var nameChild = control["name"];
        var ageChild = control["age"];
        Assert.NotNull(nameChild);
        Assert.NotNull(ageChild);

        // Verify children are accessible
        Assert.Same(nameChild, control["name"]);
        Assert.Same(ageChild, control["age"]);

        // Change to array type
        var arrayData = new[] { "item1", "item2" };
        editor.SetValue(control, arrayData);

        // Field controls should be cleared - accessing same fields should throw exception
        Assert.Throws<InvalidOperationException>(() => control["name"]);
        Assert.Throws<InvalidOperationException>(() => control["age"]);
    }

    [Fact]
    public void Element_Controls_Should_Be_Cleared_On_Type_Change()
    {
        var arrayData = new[] { "item1", "item2", "item3" };
        var control = Control.Create(arrayData);
        var editor = new ControlEditor();

        // Create element children to populate _elementControls cache
        var firstElement = control[0];
        var secondElement = control[1];
        var thirdElement = control[2];
        Assert.NotNull(firstElement);
        Assert.NotNull(secondElement);
        Assert.NotNull(thirdElement);

        // Verify children are accessible and cached
        Assert.Same(firstElement, control[0]);
        Assert.Same(secondElement, control[1]);
        Assert.Same(thirdElement, control[2]);

        // Change to object type
        var objectData = new Dictionary<string, object> { ["name"] = "John" };
        editor.SetValue(control, objectData);

        // Element controls should be cleared - accessing same indices should return null
        Assert.Null(control[0]);
        Assert.Null(control[1]);
        Assert.Null(control[2]);
    }

    [Fact]
    public void Child_Controls_Should_Not_Update_Parent_After_Type_Change()
    {
        var objectData = new Dictionary<string, object> { ["name"] = "John" };
        var control = Control.Create(objectData);
        var editor = new ControlEditor();

        // Create child control
        var nameChild = control["name"];
        Assert.NotNull(nameChild);
        Assert.Equal("John", nameChild.Value);

        // Verify child can update parent initially
        editor.SetValue(nameChild, "Jane");
        Assert.Equal("Jane", ((Dictionary<string, object>)control.Value!)["name"]);

        // Change parent to array (clears children and parent links)
        var arrayData = new[] { "item1" };
        editor.SetValue(control, arrayData);
        Assert.True(control.IsArray);

        // Old child should no longer be able to update parent
        editor.SetValue(nameChild, "ShouldNotUpdateParent");

        // Parent should remain unchanged
        Assert.True(control.IsArray);
        Assert.Equal("item1", control[0]!.Value);
        var arrayValue = (ICollection)control.Value!;
        Assert.Equal(1, arrayValue.Count);
    }

    [Fact]
    public void Orphaned_Children_Should_Still_Function_Independently()
    {
        var objectData = new Dictionary<string, object> { ["name"] = "John" };
        var control = Control.Create(objectData);
        var editor = new ControlEditor();

        // Create child control
        var nameChild = control["name"];
        Assert.NotNull(nameChild);

        // Change parent type (orphans the child)
        var arrayData = new[] { "item1" };
        editor.SetValue(control, arrayData);

        // Orphaned child should still be functional
        Assert.Equal("John", nameChild.Value);

        // Should be able to update orphaned child
        editor.SetValue(nameChild, "UpdatedName");
        Assert.Equal("UpdatedName", nameChild.Value);

        // Child should maintain its own state and be dirty since value changed from initial
        Assert.True(nameChild.IsDirty); // Should be dirty since value changed from "John" to "UpdatedName"
    }

    [Fact]
    public void Same_Type_Changes_Should_Preserve_Children()
    {
        var objectData1 = new Dictionary<string, object> { ["name"] = "John", ["age"] = 30 };
        var objectData2 = new Dictionary<string, object> { ["name"] = "Jane", ["city"] = "NYC" };
        var control = Control.Create(objectData1);
        var editor = new ControlEditor();

        // Create children
        var nameChild = control["name"];
        var ageChild = control["age"];
        Assert.NotNull(nameChild);
        Assert.NotNull(ageChild);

        // Track the specific instances
        var nameChildId = nameChild.UniqueId;
        var ageChildId = ageChild.UniqueId;

        // Change to another object (same type)
        editor.SetValue(control, objectData2);

        // Same children should be preserved (same instances)
        var preservedNameChild = control["name"];
        var preservedAgeChild = control["age"];
        Assert.NotNull(preservedNameChild);
        Assert.NotNull(preservedAgeChild);
        Assert.Equal(nameChildId, preservedNameChild.UniqueId);
        Assert.Equal(ageChildId, preservedAgeChild.UniqueId);

        // Values should be updated appropriately
        Assert.Equal("Jane", preservedNameChild.Value);
        Assert.True(preservedAgeChild.Value is UndefinedValue); // Field removed
    }

    [Fact]
    public void Array_Size_Changes_Should_Preserve_Existing_Elements()
    {
        var arrayData1 = new[] { "item1", "item2", "item3" };
        var arrayData2 = new[] { "newItem1", "newItem2", "newItem3", "newItem4", "newItem5" };
        var control = Control.Create(arrayData1);
        var editor = new ControlEditor();

        // Create element children
        var firstElement = control[0];
        var secondElement = control[1];
        var thirdElement = control[2];
        Assert.NotNull(firstElement);
        Assert.NotNull(secondElement);
        Assert.NotNull(thirdElement);

        var firstElementId = firstElement.UniqueId;
        var secondElementId = secondElement.UniqueId;
        var thirdElementId = thirdElement.UniqueId;

        // Change to larger array
        editor.SetValue(control, arrayData2);

        // Original elements should be preserved
        Assert.Equal(firstElementId, control[0]!.UniqueId);
        Assert.Equal(secondElementId, control[1]!.UniqueId);
        Assert.Equal(thirdElementId, control[2]!.UniqueId);

        // Values should be updated
        Assert.Equal("newItem1", control[0]!.Value);
        Assert.Equal("newItem2", control[1]!.Value);
        Assert.Equal("newItem3", control[2]!.Value);

        // New elements should be accessible
        Assert.NotNull(control[3]);
        Assert.NotNull(control[4]);
        Assert.Equal("newItem4", control[3]!.Value);
        Assert.Equal("newItem5", control[4]!.Value);
    }

    [Fact]
    public void Array_Shrinking_Should_Remove_Excess_Elements()
    {
        var arrayData1 = new[] { "item1", "item2", "item3", "item4" };
        var arrayData2 = new[] { "newItem1", "newItem2" };
        var control = Control.Create(arrayData1);
        var editor = new ControlEditor();

        // Create all element children
        var firstElement = control[0];
        var secondElement = control[1];
        var thirdElement = control[2];
        var fourthElement = control[3];
        Assert.NotNull(firstElement);
        Assert.NotNull(secondElement);
        Assert.NotNull(thirdElement);
        Assert.NotNull(fourthElement);

        var firstElementId = firstElement.UniqueId;
        var secondElementId = secondElement.UniqueId;

        // Change to smaller array
        editor.SetValue(control, arrayData2);

        // Remaining elements should be preserved
        Assert.Equal(firstElementId, control[0]!.UniqueId);
        Assert.Equal(secondElementId, control[1]!.UniqueId);

        // Values should be updated
        Assert.Equal("newItem1", control[0]!.Value);
        Assert.Equal("newItem2", control[1]!.Value);

        // Removed elements should not be accessible
        Assert.Null(control[2]);
        Assert.Null(control[3]);
        Assert.Equal(2, control.Count);

        // Old element references should still be functional but orphaned
        Assert.Equal("item3", thirdElement.Value);
        Assert.Equal("item4", fourthElement.Value);
    }

    [Fact]
    public void Null_To_Collection_Should_Preserve_Existing_Children()
    {
        var control = Control.Create((object?)null);
        var editor = new ControlEditor();

        // Create child of null control
        var nameChild = control["name"];
        Assert.NotNull(nameChild);
        Assert.True(nameChild.IsUndefined); // Child of null parent is undefined
        Assert.Equal(UndefinedValue.Instance, nameChild.Value);

        var nameChildId = nameChild.UniqueId;

        // Change to object
        var objectData = new Dictionary<string, object> { ["name"] = "John", ["age"] = 30 };
        editor.SetValue(control, objectData);

        // Child should be preserved and updated
        var preservedChild = control["name"];
        Assert.NotNull(preservedChild);
        Assert.Equal(nameChildId, preservedChild.UniqueId);
        Assert.Equal("John", preservedChild.Value);
    }

    [Fact]
    public void String_Type_Transitions_Should_Clear_Children()
    {
        // String to Array
        var control = Control.Create("hello");
        var editor = new ControlEditor();

        // String should not allow children initially
        Assert.Null(control[0]); // Array indexer returns null for string type
        Assert.Throws<InvalidOperationException>(() => control["prop"]); // String indexer throws for non-dict

        // Change to array
        var arrayData = new[] { "item1", "item2" };
        editor.SetValue(control, arrayData);

        // Should now allow array children
        Assert.NotNull(control[0]);
        Assert.NotNull(control[1]);

        // Change back to string
        editor.SetValue(control, "world");

        // Should clear array children
        Assert.Null(control[0]);
        Assert.Null(control[1]);
        Assert.Equal("world", control.Value);
    }

    [Fact]
    public void Mixed_Collection_Types_Should_Clear_Children()
    {
        // Test List vs Array vs Dictionary combinations
        var control = Control.Create(new List<object> { "item1", "item2" });
        var editor = new ControlEditor();

        // Create element children
        var firstElement = control[0];
        Assert.NotNull(firstElement);
        Assert.Equal("item1", firstElement.Value);

        // Change to different collection type (Dictionary)
        var dictData = new Dictionary<string, object> { ["key"] = "value" };
        editor.SetValue(control, dictData);

        // Array children should be cleared
        Assert.Null(control[0]);

        // Object children should be accessible
        Assert.NotNull(control["key"]);
        Assert.Equal("value", control["key"]!.Value);

        // Change to regular array
        var arrayData = new[] { "newItem" };
        editor.SetValue(control, arrayData);

        // Object children should be cleared - accessing string property on array throws exception
        Assert.Throws<InvalidOperationException>(() => control["key"]);

        // Array children should be accessible
        Assert.NotNull(control[0]);
        Assert.Equal("newItem", control[0]!.Value);
    }

    [Fact]
    public void Type_Change_Should_Invalidate_Child_Validity_Cache()
    {
        var objectData = new Dictionary<string, object> { ["name"] = "John" };
        var control = Control.Create(objectData);
        var editor = new ControlEditor();

        // Create child and add error
        var nameChild = control["name"];
        editor.SetError(nameChild!, "test", "Test error");

        // Parent should be invalid due to child error
        Assert.False(control.IsValid);

        // Change type (clears children)
        var arrayData = new[] { "item1" };
        editor.SetValue(control, arrayData);

        // Parent should now be valid (no children with errors)
        Assert.True(control.IsValid);
    }
}