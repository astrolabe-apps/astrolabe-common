using System;
using System.Collections.Generic;
using System.Linq;

namespace Astrolabe.Controls.Internal;

/// <summary>
/// Logic implementation for controls that manage object values.
/// </summary>
internal class ObjectLogic(
    Func<object?, object?, bool> isEqual,
    Func<string, object?, object?, ControlFlags, IInternalControl> makeChild)
    : ControlLogic(isEqual)
{
    private Dictionary<string, IInternalControl> _fields = new();

    public override ControlLogic EnsureObject()
    {
        return this;
    }

    public override IInternalControl GetField(string propertyName)
    {
        if (_fields.TryGetValue(propertyName, out var field))
        {
            return field;
        }

        var parentControl = Control;
        var value = GetPropertyValue(parentControl.Value, propertyName);
        var initialValue = GetPropertyValue(parentControl.InitialValue, propertyName);
        
        var childFlags = parentControl.Flags & (ControlFlags.Disabled | ControlFlags.Touched);
        var child = makeChild(propertyName, value, initialValue, childFlags);
        
        child.UpdateParentLink(parentControl, propertyName);
        return (_fields[propertyName] = child);
    }

    private static object? GetPropertyValue(object? obj, string propertyName)
    {
        if (obj == null)
            return null;

        if (obj is IDictionary<string, object> dict && dict.TryGetValue(propertyName, out var dictValue))
            return dictValue;

        var property = obj.GetType().GetProperty(propertyName);
        return property?.GetValue(obj);
    }

    public override ControlLogic EnsureArray()
    {
        throw new InvalidOperationException("This is an object control, not an array control.");
    }

    public override IReadOnlyList<IInternalControl> GetElements()
    {
        throw new InvalidOperationException("This is an object control, not an array control.");
    }

    public override void WithChildren(Action<IInternalControl> action)
    {
        foreach (var field in _fields.Values)
        {
            action(field);
        }
    }

    protected object? Copy(object? value)
    {
        if (value == null)
            return new Dictionary<string, object?>();
            
        if (value is IDictionary<string, object?> dict)
            return new Dictionary<string, object?>(dict);
            
        // Create a new dictionary from the object's properties
        var properties = value.GetType().GetProperties();
        var result = new Dictionary<string, object?>();
        
        foreach (var prop in properties)
        {
            if (prop.CanRead)
                result[prop.Name] = prop.GetValue(value);
        }
        
        return result;
    }

    public override void ChildValueChange(object prop, object? value)
    {
        if (prop is not string propertyName)
            throw new ArgumentException("Property must be a string for object controls", nameof(prop));
            
        var copied = Copy(Control.Value) as IDictionary<string, object?>;
        copied![propertyName] = value;
        Control.SetValueImpl(copied);
    }

    public override void ValueChanged()
    {
        var value = Control.Value as IDictionary<string, object?>;
        
        foreach (var (key, field) in _fields)
        {
            var fieldValue = value != null && value.TryGetValue(key, out var val) ? val : null;
            field.SetValueImpl(fieldValue, Control);
        }
    }

    public override void InitialValueChanged()
    {
        var initialValue = Control.InitialValue as IDictionary<string, object?>;
        
        foreach (var (key, field) in _fields)
        {
            var fieldValue = initialValue != null && initialValue.TryGetValue(key, out var val) ? val : null;
            field.SetInitialValueImpl(fieldValue);
        }
    }

    public override bool ChildrenValid()
    {
        return _fields.Values.All(field => field.IsValid());
    }

    public void SetFields(Dictionary<string, IInternalControl> fields)
    {
        WithChildren(child => child.UpdateParentLink(Control, null));
        
        foreach (var (key, field) in fields)
        {
            field.UpdateParentLink(Control, key);
        }
        
        _fields = new Dictionary<string, IInternalControl>(fields);
        
        var value = Copy(Control.Value) as IDictionary<string, object?>;
        var initialValue = Copy(Control.InitialValue) as IDictionary<string, object?>;
        
        foreach (var (key, field) in fields)
        {
            value![key] = field.Value;
            initialValue![key] = field.InitialValue;
        }
        
        Control.SetValueAndInitial(value, initialValue);
    }
}