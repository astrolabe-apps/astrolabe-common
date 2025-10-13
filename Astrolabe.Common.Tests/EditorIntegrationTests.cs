using Astrolabe.Controls;
using Xunit;
using System.Collections.Generic;

namespace Astrolabe.Common.Tests;

public class EditorIntegrationTests
{
    [Fact]
    public void Listener_Should_Receive_Working_ControlEditor()
    {
        var control = Control<object?>.Create(""); // Empty string to trigger validation error
        bool listenerCalled = false;
        
        // Subscribe with a listener that uses the provided editor
        control.Subscribe((ctrl, change, editor) =>
        {
            if ((change & ControlChange.Validate) != 0)
            {
                listenerCalled = true;
                
                // Use the provided editor to set an error
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
        
        // Validate should trigger the listener and set the error
        var editor = new ControlEditor();
        var isValid = editor.Validate(control);
        
        Assert.True(listenerCalled);
        Assert.False(isValid);
        Assert.True(control.HasErrors);
        Assert.Equal("Value is required", control.Errors["required"]);
    }
    
    [Fact]
    public void Multiple_Listeners_Should_Share_Same_Editor_Transaction()
    {
        var control = Control<object?>.Create("");
        var executionOrder = new List<string>();
        
        // First listener
        control.Subscribe((ctrl, change, editor) =>
        {
            if ((change & ControlChange.Validate) != 0)
            {
                executionOrder.Add("listener1");
                editor.SetError(ctrl, "error1", "Error from listener 1");
            }
        }, ControlChange.Validate);
        
        // Second listener  
        control.Subscribe((ctrl, change, editor) =>
        {
            if ((change & ControlChange.Validate) != 0)
            {
                executionOrder.Add("listener2");
                editor.SetError(ctrl, "error2", "Error from listener 2");
            }
        }, ControlChange.Validate);
        
        // Validate should execute both listeners in the same transaction
        var editor = new ControlEditor();
        var isValid = editor.Validate(control);
        
        Assert.Equal(2, executionOrder.Count);
        Assert.Contains("listener1", executionOrder);
        Assert.Contains("listener2", executionOrder);
        Assert.False(isValid);
        Assert.Equal(2, control.Errors.Count);
        Assert.Equal("Error from listener 1", control.Errors["error1"]);
        Assert.Equal("Error from listener 2", control.Errors["error2"]);
    }
    
    [Fact]
    public void Validate_With_Existing_Editor_Should_Reuse_Transaction()
    {
        var control = Control<object?>.Create("");
        var executionOrder = new List<string>();
        
        control.Subscribe((ctrl, change, editor) =>
        {
            if ((change & ControlChange.Validate) != 0)
            {
                executionOrder.Add("validation");
                editor.SetError(ctrl, "validation", "Validation error");
            }
        }, ControlChange.Validate);
        
        var editor = new ControlEditor();
        editor.RunInTransaction(() =>
        {
            executionOrder.Add("transaction_start");
            
            // This should reuse the existing editor/transaction
            var isValid = editor.Validate(control);
            
            executionOrder.Add("transaction_end");
            
            Assert.False(isValid);
            Assert.True(control.HasErrors);
        });
        
        Assert.Equal(3, executionOrder.Count);
        Assert.Equal("transaction_start", executionOrder[0]);
        Assert.Equal("validation", executionOrder[1]);
        Assert.Equal("transaction_end", executionOrder[2]);
    }
    
    [Fact]
    public void Cross_Field_Validation_Should_Work_With_Provided_Editor()
    {
        var parentData = new Dictionary<string, object>
        {
            { "email", "user@example.com" },
            { "confirmEmail", "different@example.com" }
        };
        var parent = Control<object?>.Create(parentData);
        
        // Set up cross-field validation
        parent.Subscribe((ctrl, change, editor) =>
        {
            if ((change & ControlChange.Validate) != 0)
            {
                var emailControl = ctrl["email"];
                var confirmControl = ctrl["confirmEmail"];
                
                if (emailControl?.Value?.ToString() != confirmControl?.Value?.ToString())
                {
                    editor.SetError(confirmControl!, "match", "Emails must match");
                }
                else
                {
                    editor.SetError(confirmControl!, "match", null);
                }
            }
        }, ControlChange.Validate);
        
        // Validate should detect mismatch
        var editor = new ControlEditor();
        var isValid = editor.Validate(parent);
        
        Assert.False(isValid);
        
        var confirmControl = parent["confirmEmail"]!;
        Assert.True(confirmControl.HasErrors);
        Assert.Equal("Emails must match", confirmControl.Errors["match"]);
    }
}