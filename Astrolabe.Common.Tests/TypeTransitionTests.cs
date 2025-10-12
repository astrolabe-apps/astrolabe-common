using Astrolabe.Controls;
using Xunit;
using System;
using System.Collections.Generic;

namespace Astrolabe.Common.Tests;

public class TypeTransitionTests
{
    [Fact]
    public void Object_To_Array_Should_Clear_All_Children()
    {
        var objectData = new Dictionary<string, object> { ["name"] = "John", ["age"] = 30 };
        var control = Control.Create(objectData);
        var editor = new ControlEditor();

        // Create field children
        var nameChild = control["name"];
        var ageChild = control["age"];
        Assert.NotNull(nameChild);
        Assert.NotNull(ageChild);
        Assert.Equal("John", nameChild.Value);
        Assert.Equal(30, ageChild.Value);

        // Change to array
        var arrayData = new[] { "item1", "item2", "item3" };
        editor.SetValue(control, arrayData);

        // Control should now be an array
        Assert.True(control.IsArray);
        Assert.False(control.IsObject);
        Assert.Equal(3, control.Count);

        // Old field children should no longer be accessible through the same indexer
        // Should throw exception when trying to access object field on array control
        Assert.Throws<InvalidOperationException>(() => control["name"]);

        // Array elements should be accessible
        Assert.NotNull(control[0]);
        Assert.NotNull(control[1]);
        Assert.NotNull(control[2]);
        Assert.Equal("item1", control[0]!.Value);
        Assert.Equal("item2", control[1]!.Value);
        Assert.Equal("item3", control[2]!.Value);
    }

    [Fact]
    public void Array_To_Object_Should_Clear_All_Children()
    {
        var arrayData = new[] { "item1", "item2", "item3" };
        var control = Control.Create(arrayData);
        var editor = new ControlEditor();

        // Create element children
        var firstElement = control[0];
        var secondElement = control[1];
        var thirdElement = control[2];
        Assert.NotNull(firstElement);
        Assert.NotNull(secondElement);
        Assert.NotNull(thirdElement);
        Assert.Equal("item1", firstElement.Value);
        Assert.Equal("item2", secondElement.Value);
        Assert.Equal("item3", thirdElement.Value);

        // Change to object
        var objectData = new Dictionary<string, object> { ["name"] = "John", ["age"] = 30 };
        editor.SetValue(control, objectData);

        // Control should now be an object
        Assert.True(control.IsObject);
        Assert.False(control.IsArray);
        Assert.Equal(2, control.Count);

        // Old array elements should no longer be accessible
        // Array indexer returns null for object types - this is correct behavior
        Assert.Null(control[0]);

        // Object fields should be accessible
        Assert.NotNull(control["name"]);
        Assert.NotNull(control["age"]);
        Assert.Equal("John", control["name"]!.Value);
        Assert.Equal(30, control["age"]!.Value);
    }

    [Fact]
    public void Object_To_Primitive_Should_Clear_All_Children()
    {
        var objectData = new Dictionary<string, object> { ["name"] = "John", ["age"] = 30 };
        var control = Control.Create(objectData);
        var editor = new ControlEditor();

        // Create field children
        var nameChild = control["name"];
        var ageChild = control["age"];
        Assert.NotNull(nameChild);
        Assert.NotNull(ageChild);

        // Change to primitive
        editor.SetValue(control, "simple string");

        // Control should now be primitive
        Assert.False(control.IsObject);
        Assert.False(control.IsArray);
        Assert.Equal(0, control.Count);
        Assert.Equal("simple string", control.Value);

        // Children should no longer be accessible
        // Should throw exception when trying to access object field on primitive control
        Assert.Throws<InvalidOperationException>(() => control["name"]);
    }

    [Fact]
    public void Array_To_Primitive_Should_Clear_All_Children()
    {
        var arrayData = new[] { "item1", "item2", "item3" };
        var control = Control.Create(arrayData);
        var editor = new ControlEditor();

        // Create element children
        var firstElement = control[0];
        var secondElement = control[1];
        Assert.NotNull(firstElement);
        Assert.NotNull(secondElement);

        // Change to primitive
        editor.SetValue(control, 42);

        // Control should now be primitive
        Assert.False(control.IsObject);
        Assert.False(control.IsArray);
        Assert.Equal(0, control.Count);
        Assert.Equal(42, control.Value);

        // Children should no longer be accessible
        var newFirstElement = control[0];
        Assert.Null(newFirstElement);
    }

    [Fact]
    public void Primitive_To_Object_Should_Allow_New_Children()
    {
        var control = Control.Create("simple string");
        var editor = new ControlEditor();

        // Initially primitive
        Assert.False(control.IsObject);
        Assert.False(control.IsArray);
        Assert.Equal("simple string", control.Value);

        // Change to object
        var objectData = new Dictionary<string, object> { ["name"] = "John", ["age"] = 30 };
        editor.SetValue(control, objectData);

        // Control should now be an object with accessible children
        Assert.True(control.IsObject);
        Assert.False(control.IsArray);
        Assert.Equal(2, control.Count);

        Assert.NotNull(control["name"]);
        Assert.NotNull(control["age"]);
        Assert.Equal("John", control["name"]!.Value);
        Assert.Equal(30, control["age"]!.Value);
    }

    [Fact]
    public void Primitive_To_Array_Should_Allow_New_Children()
    {
        var control = Control.Create(42);
        var editor = new ControlEditor();

        // Initially primitive
        Assert.False(control.IsObject);
        Assert.False(control.IsArray);
        Assert.Equal(42, control.Value);

        // Change to array
        var arrayData = new[] { "item1", "item2", "item3" };
        editor.SetValue(control, arrayData);

        // Control should now be an array with accessible children
        Assert.False(control.IsObject);
        Assert.True(control.IsArray);
        Assert.Equal(3, control.Count);

        Assert.NotNull(control[0]);
        Assert.NotNull(control[1]);
        Assert.NotNull(control[2]);
        Assert.Equal("item1", control[0]!.Value);
        Assert.Equal("item2", control[1]!.Value);
        Assert.Equal("item3", control[2]!.Value);
    }

    [Fact]
    public void String_Should_Not_Be_Treated_As_Array()
    {
        var control = Control.Create("hello");
        var editor = new ControlEditor();

        // String should not be treated as array
        Assert.False(control.IsArray);
        Assert.False(control.IsObject);
        Assert.Equal(0, control.Count);

        // Array indexer should return null
        Assert.Null(control[0]);
        Assert.Null(control[1]);

        // Changing from string to array should work
        var arrayData = new[] { "item1", "item2" };
        editor.SetValue(control, arrayData);

        Assert.True(control.IsArray);
        Assert.Equal(2, control.Count);
        Assert.NotNull(control[0]);
        Assert.NotNull(control[1]);
    }

    [Fact]
    public void Array_To_String_Should_Clear_Children()
    {
        var arrayData = new[] { "item1", "item2" };
        var control = Control.Create(arrayData);
        var editor = new ControlEditor();

        // Create element children
        var firstElement = control[0];
        Assert.NotNull(firstElement);
        Assert.True(control.IsArray);

        // Change to string
        editor.SetValue(control, "hello world");

        // Should no longer be array
        Assert.False(control.IsArray);
        Assert.False(control.IsObject);
        Assert.Equal("hello world", control.Value);

        // Array children should no longer be accessible
        Assert.Null(control[0]);
    }

    [Fact]
    public void Child_Control_Parent_Links_Should_Be_Cleared_On_Type_Change()
    {
        var objectData = new Dictionary<string, object> { ["name"] = "John" };
        var control = Control.Create(objectData);
        var editor = new ControlEditor();

        // Create child and verify it has parent link
        var nameChild = control["name"];
        Assert.NotNull(nameChild);
        Assert.Equal("John", nameChild.Value);

        // Modify child value to verify parent link works
        editor.SetValue(nameChild, "Jane");
        Assert.Equal("Jane", ((Dictionary<string, object>)control.Value!)["name"]);

        // Change parent to array (should clear children)
        var arrayData = new[] { "item1", "item2" };
        editor.SetValue(control, arrayData);

        // The old nameChild should no longer update the parent
        // (This verifies parent links were properly cleared)
        editor.SetValue(nameChild, "UpdatedName");

        // Parent should still be array, not affected by the old child
        Assert.True(control.IsArray);
        Assert.Equal(2, control.Count);
        Assert.Equal("item1", control[0]!.Value);
        Assert.Equal("item2", control[1]!.Value);
    }

    [Fact]
    public void Null_To_Object_Should_Not_Clear_Children()
    {
        var control = Control.Create((object?)null);
        var editor = new ControlEditor();

        // Access child of null control (should create child with undefined value)
        var nameChild = control["name"];
        Assert.NotNull(nameChild);
        Assert.True(nameChild.Value is UndefinedValue);

        // Set the control to an object
        var objectData = new Dictionary<string, object> { ["name"] = "John", ["age"] = 30 };
        editor.SetValue(control, objectData);

        // Child should be preserved and updated
        var newNameChild = control["name"];
        Assert.Same(nameChild, newNameChild); // Same instance
        Assert.Equal("John", nameChild.Value); // Updated value

        // New fields should be accessible
        Assert.NotNull(control["age"]);
        Assert.Equal(30, control["age"]!.Value);
    }

    [Fact]
    public void Object_To_Object_Should_Preserve_Children()
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

        // Change to different object
        editor.SetValue(control, objectData2);

        // Children should be preserved
        var newNameChild = control["name"];
        var newAgeChild = control["age"];
        Assert.Same(nameChild, newNameChild); // Same instance
        Assert.Same(ageChild, newAgeChild); // Same instance

        // Values should be updated
        Assert.Equal("Jane", nameChild.Value);
        Assert.True(ageChild.Value is UndefinedValue); // Field no longer exists

        // New field should be accessible
        Assert.NotNull(control["city"]);
        Assert.Equal("NYC", control["city"]!.Value);
    }

    [Fact]
    public void Array_To_Array_Should_Preserve_Children()
    {
        var arrayData1 = new[] { "item1", "item2", "item3" };
        var arrayData2 = new[] { "newItem1", "newItem2" };
        var control = Control.Create(arrayData1);
        var editor = new ControlEditor();

        // Create element children
        var firstElement = control[0];
        var secondElement = control[1];
        var thirdElement = control[2];
        Assert.NotNull(firstElement);
        Assert.NotNull(secondElement);
        Assert.NotNull(thirdElement);

        // Change to different array
        editor.SetValue(control, arrayData2);

        // First two children should be preserved
        var newFirstElement = control[0];
        var newSecondElement = control[1];
        Assert.Same(firstElement, newFirstElement); // Same instance
        Assert.Same(secondElement, newSecondElement); // Same instance

        // Values should be updated
        Assert.Equal("newItem1", firstElement.Value);
        Assert.Equal("newItem2", secondElement.Value);

        // Third element should no longer be accessible
        Assert.Null(control[2]);
        Assert.Equal(2, control.Count);
    }

    [Fact]
    public void Complex_Nested_Type_Changes_Should_Work()
    {
        var nestedObject = new Dictionary<string, object>
        {
            ["user"] = new Dictionary<string, object>
            {
                ["name"] = "John",
                ["hobbies"] = new[] { "reading", "gaming" }
            }
        };
        var control = Control.Create(nestedObject);
        var editor = new ControlEditor();

        // Access nested structures
        var userChild = control["user"];
        var nameChild = userChild!["name"];
        var hobbiesChild = userChild["hobbies"];
        var firstHobby = hobbiesChild![0];

        Assert.Equal("John", nameChild!.Value);
        Assert.Equal("reading", firstHobby!.Value);

        // Change the entire structure to an array
        var newArrayData = new[] { "item1", "item2" };
        editor.SetValue(control, newArrayData);

        // Control should now be array
        Assert.True(control.IsArray);
        Assert.Equal(2, control.Count);

        // Old nested children should no longer be accessible via object indexer
        // Should throw exception when trying to access object field on array control
        Assert.Throws<InvalidOperationException>(() => control["user"]);

        // New array elements should be accessible
        Assert.NotNull(control[0]);
        Assert.NotNull(control[1]);
        Assert.Equal("item1", control[0]!.Value);
        Assert.Equal("item2", control[1]!.Value);
    }
}