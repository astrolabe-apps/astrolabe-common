using Astrolabe.Controls;
using Xunit;
using System;
using System.Collections.Generic;

namespace Astrolabe.Common.Tests;

public class ValidatorFactoryTests
{
    [Fact]
    public void Create_Without_Validator_Should_Create_Normal_Control()
    {
        var control = Control.Create("test");
        
        Assert.False(control.HasErrors);
        Assert.False(control.Errors.ContainsKey("default"));
        Assert.Equal("test", control.Value);
    }

    [Fact]
    public void Create_With_Validator_Should_Setup_Initial_Validation()
    {
        var control = Control.Create("", value => 
            string.IsNullOrEmpty(value) ? "Required" : null);
        
        Assert.True(control.HasErrors);
        Assert.Equal("Required", control.Errors["default"]);
        Assert.False(control.IsValid);
    }

    [Fact]
    public void Create_With_Valid_Initial_Value_Should_Have_No_Errors()
    {
        var control = Control.Create("valid", value => 
            string.IsNullOrEmpty(value) ? "Required" : null);
        
        Assert.False(control.HasErrors);
        Assert.True(control.IsValid);
        Assert.Equal("valid", control.Value);
    }

    [Fact]
    public void Validator_Should_Trigger_On_Value_Change()
    {
        var control = Control.Create(5, value => 
            value < 0 ? "Must be positive" : null);
        var editor = new ControlEditor();
        
        Assert.False(control.HasErrors); // Initial value is valid
        
        editor.SetValue(control, -1);
        
        Assert.True(control.HasErrors);
        Assert.Equal("Must be positive", control.Errors["default"]);
        Assert.False(control.IsValid);
    }

    [Fact]
    public void Validator_Should_Clear_Error_When_Value_Becomes_Valid()
    {
        var control = Control.Create("", value => 
            string.IsNullOrEmpty(value) ? "Required" : null);
        var editor = new ControlEditor();
        
        Assert.True(control.HasErrors); // Initially invalid
        
        editor.SetValue(control, "valid value");
        
        Assert.False(control.HasErrors);
        Assert.True(control.IsValid);
        Assert.False(control.Errors.ContainsKey("default"));
    }

    [Fact]
    public void Validator_Should_Trigger_On_Explicit_Validate()
    {
        var control = Control.Create("invalid", value => "Always invalid");
        
        // Initial validation has already run
        Assert.True(control.HasErrors);
        Assert.Equal("Always invalid", control.Errors["default"]);
        
        // Validate explicitly should still work
        var editor = new ControlEditor();
        editor.Validate(control);
        
        Assert.True(control.HasErrors);
        Assert.Equal("Always invalid", control.Errors["default"]);
        Assert.False(control.IsValid);
    }

    [Fact]
    public void Generic_Factory_Should_Handle_Value_Types()
    {
        var control = Control.Create(42, value => 
            value > 100 ? "Too large" : null);
        
        Assert.False(control.HasErrors);
        Assert.Equal(42, control.Value);
        Assert.True(control.IsValid);
    }

    [Fact]
    public void Generic_Factory_Should_Handle_Nullable_Value_Types()
    {
        var control = Control.Create(null, (Func<int?, string?>)(value =>
            value.HasValue && value < 0 ? "Must be positive" : null));
        
        Assert.False(control.HasErrors);
        Assert.Null(control.Value);
        Assert.True(control.IsValid);
    }

    [Fact]
    public void Generic_Factory_Should_Handle_Reference_Types()
    {
        var control = Control.Create(null, (Func<string?, string?>)(value =>
            value?.Length > 10 ? "Too long" : null));
        
        Assert.False(control.HasErrors);
        Assert.Null(control.Value);
        Assert.True(control.IsValid);
    }

    [Fact]
    public void Validator_Should_Handle_Type_Casting_Correctly()
    {
        var control = Control.Create(99.99m, value => 
            value > 100 ? "Over budget" : null);
        var editor = new ControlEditor();
        
        Assert.False(control.HasErrors);
        
        editor.SetValue(control, 150.50m);
        
        Assert.True(control.HasErrors);
        Assert.Equal("Over budget", control.Errors["default"]);
    }

    [Fact]
    public void Complex_Validator_Should_Work()
    {
        var control = Control.Create("", password =>
        {
            if (string.IsNullOrEmpty(password)) return "Password is required";
            if (password.Length < 8) return "Password must be at least 8 characters";
            if (!password.Any(char.IsDigit)) return "Password must contain at least one digit";
            return null;
        });
        var editor = new ControlEditor();
        
        Assert.Equal("Password is required", control.Errors["default"]);
        
        editor.SetValue(control, "short");
        Assert.Equal("Password must be at least 8 characters", control.Errors["default"]);
        
        editor.SetValue(control, "longenough");
        Assert.Equal("Password must contain at least one digit", control.Errors["default"]);
        
        editor.SetValue(control, "longenough1");
        Assert.False(control.HasErrors);
        Assert.True(control.IsValid);
    }

    [Fact]
    public void Validated_Control_Should_Work_With_ControlEditor_Transactions()
    {
        var control = Control.Create("", value => 
            string.IsNullOrEmpty(value) ? "Required" : null);
        var editor = new ControlEditor();
        
        Assert.True(control.HasErrors); // Initially invalid
        
        editor.RunInTransaction(() =>
        {
            editor.SetValue(control, "valid value");
            // Validation should trigger within transaction
        });
        
        Assert.False(control.HasErrors);
        Assert.Equal("valid value", control.Value);
        Assert.True(control.IsValid);
    }

    [Fact]
    public void Validated_Control_Should_Work_With_Manual_Validation()
    {
        var control = Control.Create("test", value => 
            string.IsNullOrEmpty(value) ? "Required" : null);
        
        // Add additional manual validation and trigger it
        control.Subscribe((ctrl, change, editor) =>
        {
            var email = ctrl.Value as string;
            if (!string.IsNullOrEmpty(email) && !email.Contains('@'))
            {
                editor.SetError(ctrl, "format", "Invalid email format");
            }
            else
            {
                editor.SetError(ctrl, "format", null);
            }
        }, ControlChange.Value | ControlChange.Validate);
        
        // Trigger manual validation by calling Validate
        var editor = new ControlEditor();
        editor.Validate(control);
        
        // Should pass required validation but fail format validation
        Assert.False(control.Errors.ContainsKey("default")); // Required validation passes
        Assert.Equal("Invalid email format", control.Errors["format"]); // Format validation fails
        Assert.False(control.IsValid); // Overall invalid
    }

    [Fact]
    public void Multiple_Validated_Controls_Should_Work_Independently()
    {
        var emailControl = Control.Create("", value => 
            string.IsNullOrEmpty(value) ? "Email required" : null);
        var ageControl = Control.Create(-1, value => 
            value < 0 ? "Age must be positive" : null);
        var editor = new ControlEditor();
        
        Assert.Equal("Email required", emailControl.Errors["default"]);
        Assert.Equal("Age must be positive", ageControl.Errors["default"]);
        
        editor.SetValue(emailControl, "test@example.com");
        
        Assert.False(emailControl.HasErrors);
        Assert.True(ageControl.HasErrors); // Should be unaffected
    }

    [Fact]
    public void Validator_Should_Work_With_Hierarchical_Controls()
    {
        var parentData = new Dictionary<string, object>
        {
            { "email", "" },
            { "age", 25 }
        };
        var parent = Control.Create(parentData);
        
        // Get child control and add validator
        var emailChild = parent["email"]!;
        var validatedEmailChild = Control.Create(emailChild.Value as string ?? "", value => 
            string.IsNullOrEmpty(value) ? "Email is required" : null);
        
        Assert.True(validatedEmailChild.HasErrors);
        Assert.Equal("Email is required", validatedEmailChild.Errors["default"]);
    }

    [Fact]
    public void Validator_Should_Handle_Default_Values_Correctly()
    {
        // Test with default value for value type
        var intControl = Control.Create(0, value =>
            value == 0 ? "Cannot be zero" : null);

        Assert.Equal(0, intControl.Value);
        Assert.Equal("Cannot be zero", intControl.Errors["default"]);

        // Test with default value for reference type
        var stringControl = Control.Create(null, (Func<string?, string?>)(value =>
            value == null ? "Cannot be null" : null));
        
        Assert.Null(stringControl.Value);
        Assert.Equal("Cannot be null", stringControl.Errors["default"]);
    }

    [Fact]
    public void Range_Validator_Example_Should_Work()
    {
        var ageControl = Control.Create(150, age => 
            age < 0 || age > 120 ? "Age must be between 0 and 120" : null);
        var editor = new ControlEditor();
        
        Assert.Equal("Age must be between 0 and 120", ageControl.Errors["default"]);
        
        editor.SetValue(ageControl, 25);
        Assert.False(ageControl.HasErrors);
        
        editor.SetValue(ageControl, -5);
        Assert.Equal("Age must be between 0 and 120", ageControl.Errors["default"]);
    }

    [Fact]
    public void Email_Format_Validator_Example_Should_Work()
    {
        var emailControl = Control.Create("invalid-email", email =>
            !string.IsNullOrEmpty(email) && !email.Contains('@') ? "Invalid email format" : null);
        var editor = new ControlEditor();
        
        Assert.Equal("Invalid email format", emailControl.Errors["default"]);
        
        editor.SetValue(emailControl, "test@example.com");
        Assert.False(emailControl.HasErrors);
        
        editor.SetValue(emailControl, "");
        Assert.False(emailControl.HasErrors); // Empty is allowed in this validator
        
        editor.SetValue(emailControl, "still-invalid");
        Assert.Equal("Invalid email format", emailControl.Errors["default"]);
    }

    [Fact]
    public void Backward_Compatibility_Should_Be_Maintained()
    {
        // All existing Create calls should continue to work
        var control1 = Control.Create();
        var control2 = Control.Create("test");
        var control3 = Control.Create(42);
        var control4 = Control.Create(new { name = "test" });
        
        Assert.NotNull(control1);
        Assert.NotNull(control2);
        Assert.NotNull(control3);
        Assert.NotNull(control4);
        
        Assert.False(control1.HasErrors);
        Assert.False(control2.HasErrors);
        Assert.False(control3.HasErrors);
        Assert.False(control4.HasErrors);
    }
}