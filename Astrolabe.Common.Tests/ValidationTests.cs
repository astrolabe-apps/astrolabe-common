using Astrolabe.Controls;
using Xunit;
using System.Collections.Generic;

namespace Astrolabe.Common.Tests;

public class ValidationTests
{
    [Fact]
    public void Control_Without_Errors_Should_Be_Valid()
    {
        var control = Control<object?>.Create("test");
        
        Assert.True(control.IsValid);
        Assert.False(control.HasErrors);
        Assert.Empty(control.Errors);
    }

    [Fact]
    public void Control_With_Errors_Should_Be_Invalid()
    {
        var control = Control<object?>.Create("test");
        var editor = new ControlEditor();
        
        editor.SetError(control, "required", "Value is required");
        
        Assert.False(control.IsValid);
        Assert.True(control.HasErrors);
        Assert.Single(control.Errors);
        Assert.Equal("Value is required", control.Errors["required"]);
    }

    [Fact]
    public void Control_With_Valid_Children_Should_Be_Valid()
    {
        var parentData = new Dictionary<string, object>
        {
            { "name", "John" },
            { "age", 30 }
        };
        var parent = Control<object?>.Create(parentData);
        
        // Access child controls to create them
        var nameControl = parent["name"];
        var ageControl = parent["age"];
        
        Assert.True(parent.IsValid);
        Assert.True(nameControl?.IsValid);
        Assert.True(ageControl?.IsValid);
    }

    [Fact]
    public void Control_With_Invalid_Child_Should_Be_Invalid()
    {
        var parentData = new Dictionary<string, object>
        {
            { "name", "John" },
            { "age", 30 }
        };
        var parent = Control<object?>.Create(parentData);
        var editor = new ControlEditor();
        
        // Access child controls
        var nameControl = parent["name"]!;
        var ageControl = parent["age"]!;
        
        // Make one child invalid
        editor.SetError(nameControl, "required", "Name is required");
        
        Assert.False(parent.IsValid); // Parent becomes invalid
        Assert.False(nameControl.IsValid); // Child is invalid
        Assert.True(ageControl.IsValid); // Other child is still valid
    }

    [Fact]
    public void Nested_Invalid_Child_Should_Make_All_Parents_Invalid()
    {
        var data = new Dictionary<string, object>
        {
            { "user", new Dictionary<string, object>
                {
                    { "profile", new Dictionary<string, object>
                        {
                            { "name", "John" }
                        }
                    }
                }
            }
        };
        var root = Control<object?>.Create(data);
        var editor = new ControlEditor();
        
        // Navigate to deeply nested control
        var userControl = root["user"]!;
        var profileControl = userControl["profile"]!;
        var nameControl = profileControl["name"]!;
        
        // All should be valid initially
        Assert.True(root.IsValid);
        Assert.True(userControl.IsValid);
        Assert.True(profileControl.IsValid);
        Assert.True(nameControl.IsValid);
        
        // Make the deeply nested control invalid
        editor.SetError(nameControl, "minLength", "Name too short");
        
        // All parents should become invalid
        Assert.False(root.IsValid);
        Assert.False(userControl.IsValid);
        Assert.False(profileControl.IsValid);
        Assert.False(nameControl.IsValid);
    }

    [Fact]
    public void Validate_Method_Should_Return_Current_Validity_State()
    {
        var control = Control<object?>.Create("test");
        var editor = new ControlEditor();
        
        // Initially valid
        Assert.True(editor.Validate(control));
        
        // Add error and validate again
        editor.SetError(control, "required", "Value is required");
        Assert.False(editor.Validate(control));
        
        // Clear error and validate again
        editor.ClearErrors(control);
        Assert.True(editor.Validate(control));
    }

    [Fact]
    public void Validate_Should_Trigger_Validation_Listeners()
    {
        var control = Control<object?>.Create("");
        bool validationTriggered = false;
        
        // Subscribe to validation events
        control.Subscribe((ctrl, change, editor) =>
        {
            if ((change & ControlChange.Validate) != 0)
            {
                validationTriggered = true;
                // Simulate validation logic
                if (string.IsNullOrEmpty(ctrl.Value as string))
                {
                    editor.SetError(ctrl, "required", "Value is required");
                }
                else
                {
                    editor.SetError(ctrl, "required", null);
                }
            }
        }, ControlChange.Validate);
        
        // Call validate
        var editor = new ControlEditor();
        bool result = editor.Validate(control);
        
        Assert.True(validationTriggered);
        Assert.False(result); // Should be invalid due to validation logic
        Assert.Equal("Value is required", control.Errors["required"]);
    }

    [Fact]
    public void Validate_Should_Process_Children_First()
    {
        var parentData = new Dictionary<string, object>
        {
            { "name", "" },
            { "age", 25 }
        };
        var parent = Control<object?>.Create(parentData);
        var validationOrder = new List<string>();
        
        // Access children
        var nameControl = parent["name"]!;
        var ageControl = parent["age"]!;
        
        // Set up validation listeners
        nameControl.Subscribe((ctrl, change, editor) =>
        {
            if ((change & ControlChange.Validate) != 0)
            {
                validationOrder.Add("name");
                if (string.IsNullOrEmpty(ctrl.Value as string))
                {
                    editor.SetError(ctrl, "required", "Name is required");
                }
            }
        }, ControlChange.Validate);
        
        ageControl.Subscribe((ctrl, change, editor) =>
        {
            if ((change & ControlChange.Validate) != 0)
            {
                validationOrder.Add("age");
            }
        }, ControlChange.Validate);
        
        parent.Subscribe((ctrl, change, editor) =>
        {
            if ((change & ControlChange.Validate) != 0)
            {
                validationOrder.Add("parent");
            }
        }, ControlChange.Validate);
        
        // Validate parent (should validate children first)
        var editor = new ControlEditor();
        editor.Validate(parent);
        
        // Children should be validated before parent
        Assert.Equal(3, validationOrder.Count);
        Assert.Contains("name", validationOrder);
        Assert.Contains("age", validationOrder);
        Assert.Contains("parent", validationOrder);
        Assert.Equal("parent", validationOrder.Last()); // Parent should be last
    }

    [Fact]
    public void GetChangeState_Should_Include_Valid_Flag_When_Valid()
    {
        var control = Control<object?>.Create("test");
        var editor = new ControlEditor();
        bool validNotificationReceived = false;
        
        // Make control invalid first
        editor.SetError(control, "test", "Test error");
        
        // Subscribe to valid changes
        control.Subscribe((ctrl, change, editor) =>
        {
            if ((change & ControlChange.Valid) != 0)
            {
                validNotificationReceived = true;
            }
        }, ControlChange.Valid);
        
        // Clear error to make control valid - this should trigger notification
        editor.ClearErrors(control);
        
        Assert.True(validNotificationReceived);
    }

    [Fact]
    public void GetChangeState_Should_Not_Include_Valid_Flag_When_Invalid()
    {
        var control = Control<object?>.Create("test");
        var editor = new ControlEditor();
        bool validNotificationReceived = false;
        
        // Make control invalid first
        editor.SetError(control, "test", "Test error");
        
        // Then subscribe
        control.Subscribe((ctrl, change, editor) =>
        {
            if ((change & ControlChange.Valid) != 0)
            {
                validNotificationReceived = true;
            }
        }, ControlChange.Valid);
        
        // Should not receive valid notification for invalid control
        Assert.False(validNotificationReceived);
    }

    [Fact]
    public void Array_Controls_Should_Propagate_Validity()
    {
        var arrayData = new List<object> { "item1", "item2", "item3" };
        var arrayControl = Control<object?>.Create(arrayData);
        var editor = new ControlEditor();
        
        // Access array elements
        var item0 = arrayControl[0]!;
        var item1 = arrayControl[1]!;
        var item2 = arrayControl[2]!;
        
        // All should be valid initially
        Assert.True(arrayControl.IsValid);
        Assert.True(item0.IsValid);
        Assert.True(item1.IsValid);
        Assert.True(item2.IsValid);
        
        // Make one element invalid
        editor.SetError(item1, "validation", "Invalid item");
        
        // Array should become invalid
        Assert.False(arrayControl.IsValid);
        Assert.True(item0.IsValid);
        Assert.False(item1.IsValid);
        Assert.True(item2.IsValid);
        
        // Clear error
        editor.ClearErrors(item1);
        
        // Array should become valid again
        Assert.True(arrayControl.IsValid);
        Assert.True(item1.IsValid);
    }

    [Fact]
    public void Adding_Elements_Should_Invalidate_Validity_Cache()
    {
        var arrayData = new List<object> { "item1" };
        var arrayControl = Control<object?>.Create(arrayData);
        var editor = new ControlEditor();
        
        // Initially valid
        Assert.True(arrayControl.IsValid);
        
        // Add element with error
        editor.AddElement(arrayControl, "invalid_item");
        
        // Access the new element and add error
        var newElement = arrayControl[1]!;
        editor.SetError(newElement, "test", "Test error");
        
        // Array should be invalid now
        Assert.False(arrayControl.IsValid);
    }

    [Fact]
    public void Removing_Elements_Should_Invalidate_Validity_Cache()
    {
        var arrayData = new List<object> { "item1", "item2" };
        var arrayControl = Control<object?>.Create(arrayData);
        var editor = new ControlEditor();
        
        // Access elements to ensure they're created
        var item0 = arrayControl[0]!;
        var item1 = arrayControl[1]!;
        
        // Make second element invalid
        editor.SetError(item1, "test", "Test error");
        
        // Array should be invalid
        Assert.False(arrayControl.IsValid);
        
        // Remove the invalid element
        editor.RemoveElement(arrayControl, 1);
        
        // Array should become valid again (invalid child was removed)
        Assert.True(arrayControl.IsValid);
        
        // Verify only one element remains
        Assert.Equal(1, arrayControl.Count);
        Assert.Equal("item1", arrayControl[0]?.Value);
    }

    [Fact]
    public void Validity_Cache_Should_Be_Efficient()
    {
        var data = new Dictionary<string, object>();
        
        // Create large nested structure
        for (int i = 0; i < 100; i++)
        {
            data[$"field{i}"] = new Dictionary<string, object>
            {
                { "nested", $"value{i}" }
            };
        }
        
        var control = Control<object?>.Create(data);
        
        // Access all children to create them
        for (int i = 0; i < 100; i++)
        {
            var child = control[$"field{i}"];
            var nested = child!["nested"];
        }
        
        // Multiple validity checks should be fast (cached)
        var start = DateTime.Now;
        for (int i = 0; i < 1000; i++)
        {
            var isValid = control.IsValid;
        }
        var elapsed = DateTime.Now - start;
        
        // Should complete very quickly due to caching
        Assert.True(elapsed.TotalMilliseconds < 100, $"Validity checking took too long: {elapsed.TotalMilliseconds}ms");
        Assert.True(control.IsValid);
    }

    [Fact]
    public void Error_State_Changes_Should_Propagate_To_Parents()
    {
        var parentData = new Dictionary<string, object>
        {
            { "child", new Dictionary<string, object> { { "value", "test" } } }
        };
        var parent = Control<object?>.Create(parentData);
        var editor = new ControlEditor();
        
        var child = parent["child"]!;
        var grandchild = child["value"]!;
        
        // All valid initially
        Assert.True(parent.IsValid);
        Assert.True(child.IsValid);
        Assert.True(grandchild.IsValid);
        
        // Add error to grandchild
        editor.SetError(grandchild, "test", "Error");
        
        // All should become invalid
        Assert.False(parent.IsValid);
        Assert.False(child.IsValid);
        Assert.False(grandchild.IsValid);
        
        // Clear error
        editor.SetError(grandchild, "test", null);
        
        // All should become valid again
        Assert.True(parent.IsValid);
        Assert.True(child.IsValid);
        Assert.True(grandchild.IsValid);
    }

    [Fact]
    public void SetErrors_Should_Handle_Empty_And_Null_Values()
    {
        var control = Control<object?>.Create("test");
        var editor = new ControlEditor();
        
        // Set errors with empty and null values
        var errors = new Dictionary<string, string>
        {
            { "error1", "Valid error" },
            { "error2", "" },     // Empty string
            { "error3", null! },  // Null
            { "error4", "Another valid error" }
        };
        
        editor.SetErrors(control, errors);
        
        // Only non-empty errors should be kept
        Assert.Equal(2, control.Errors.Count);
        Assert.Equal("Valid error", control.Errors["error1"]);
        Assert.Equal("Another valid error", control.Errors["error4"]);
        Assert.False(control.Errors.ContainsKey("error2"));
        Assert.False(control.Errors.ContainsKey("error3"));
        Assert.False(control.IsValid);
    }

    [Fact]
    public void SetError_With_Null_Should_Remove_Error()
    {
        var control = Control<object?>.Create("test");
        var editor = new ControlEditor();
        
        // Add error
        editor.SetError(control, "test", "Test error");
        Assert.False(control.IsValid);
        Assert.Single(control.Errors);
        
        // Remove error with null
        editor.SetError(control, "test", null);
        Assert.True(control.IsValid);
        Assert.Empty(control.Errors);
        
        // Remove error with empty string
        editor.SetError(control, "test2", "Another error");
        editor.SetError(control, "test2", "");
        Assert.True(control.IsValid);
        Assert.Empty(control.Errors);
    }

    [Fact]
    public void ClearErrors_Should_Make_Control_Valid()
    {
        var control = Control<object?>.Create("test");
        var editor = new ControlEditor();
        
        // Add multiple errors
        editor.SetError(control, "error1", "Error 1");
        editor.SetError(control, "error2", "Error 2");
        
        Assert.False(control.IsValid);
        Assert.Equal(2, control.Errors.Count);
        
        // Clear all errors
        editor.ClearErrors(control);
        
        Assert.True(control.IsValid);
        Assert.Empty(control.Errors);
    }
}