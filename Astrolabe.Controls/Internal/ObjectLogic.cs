using System;
using System.Collections.Generic;
using System.Linq;

namespace Astrolabe.Controls.Internal;

/// <summary>
/// Logic implementation for controls that manage object values.
/// </summary>
internal class ObjectLogic : ControlLogic
{
    private Dictionary<string, ControlImpl> _fields = new();
    private readonly Func<string, object?, object?, ControlFlags, ControlImpl> _makeChild;

    public ObjectLogic(
        Func<object?, object?, bool> isEqual,
        Func<string, object?, object?, ControlFlags, ControlImpl> makeChild)
        : base(isEqual)
    {
        _makeChild = makeChild;
    }

    public override ControlLogic EnsureObject(ControlImpl control)
    {
        return this;
    }

    public override ControlImpl GetField(ControlImpl control, string propertyName)
    {
        if (_fields.TryGetValue(propertyName, out var field))
        {
            return field;
        }

        var value = GetPropertyValue(control.Value, propertyName);
        var initialValue = GetPropertyValue(control.InitialValue, propertyName);
        
        var childFlags = control.Flags & (ControlFlags.Disabled | ControlFlags.Touched);
        var child = _makeChild(propertyName, value, initialValue, childFlags);
        
        child.UpdateParentLink(control, propertyName);
        return _fields[propertyName] = child;
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

    public override ControlLogic EnsureArray(ControlImpl control)
    {
        throw new InvalidOperationException("This is an object control, not an array control.");
    }

    public override IReadOnlyList<ControlImpl> GetElements(ControlImpl control)
    {
        throw new InvalidOperationException("This is an object control, not an array control.");
    }

    public override void WithChildren(ControlImpl control, Action<ControlImpl> action)
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

    public override void ChildValueChange(IControlTransactions ctx, ControlImpl control, object prop, object? value)
    {
        if (prop is not string propertyName)
            throw new ArgumentException("Property must be a string for object controls", nameof(prop));
            
        var copied = Copy(control.Value) as IDictionary<string, object?>;
        copied![propertyName] = value;
        control.SetValueImpl(ctx, copied);
    }

    public override void ValueChanged(IControlTransactions ctx, ControlImpl control)
    {
        var value = control.Value as IDictionary<string, object?>;
        
        foreach (var (key, field) in _fields)
        {
            var fieldValue = value != null && value.TryGetValue(key, out var val) ? val : null;
            field.SetValueImpl(ctx, fieldValue, control);
        }
    }

    public override void InitialValueChanged(IControlTransactions ctx, ControlImpl control)
    {
        var initialValue = control.InitialValue as IDictionary<string, object?>;
        
        foreach (var (key, field) in _fields)
        {
            var fieldValue = initialValue != null && initialValue.TryGetValue(key, out var val) ? val : null;
            field.SetInitialValueImpl(ctx, fieldValue);
        }
    }

    public override bool ChildrenValid()
    {
        return _fields.Values.All(field => field.IsValid());
    }
}