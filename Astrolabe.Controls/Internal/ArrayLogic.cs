using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;

namespace Astrolabe.Controls.Internal;

/// <summary>
/// Logic implementation for controls that manage array values.
/// </summary>
internal class ArrayLogic(
    Func<object?, object?, bool> isEqual,
    Func<object?, object?, ControlFlags, IInternalControl> makeChild)
    : ControlLogic(isEqual)
{
    private List<IInternalControl> _elements = new();

    public override IInternalControl GetField(string propertyName)
    {
        throw new InvalidOperationException("This is an array control, not an object control.");
    }

    public override ControlLogic EnsureObject()
    {
        throw new InvalidOperationException("This is an array control, not an object control.");
    }

    public override ControlLogic EnsureArray()
    {
        return this;
    }

    public override IReadOnlyList<IInternalControl> GetElements()
    {
        if (_elements.Count == 0)
        {
            UpdateFromValue(_elements);
        }
        return _elements;
    }

    public void UpdateFromValue(
        List<IInternalControl> existing,
        bool noInitial = false,
        bool noValue = false)
    {
        var parentControl = Control;
        var values = (parentControl.Value as IEnumerable)?.Cast<object?>().ToList() ?? new List<object?>();
        var initialValues = (parentControl.InitialValue as IEnumerable)?.Cast<object?>().ToList() ?? new List<object?>();
        var flags = parentControl.Flags & (ControlFlags.Disabled | ControlFlags.Touched);
        
        var newElements = new List<IInternalControl>();
        
        for (int i = 0; i < values.Count; i++)
        {
            IInternalControl child;
            if (i < existing.Count)
            {
                child = existing[i];
                if (!noValue) child.SetValueImpl(values[i], parentControl);
                if (!noInitial)
                {
                    child.SetInitialValueImpl(i < initialValues.Count ? initialValues[i] : null);
                    child.UpdateParentLink(parentControl, i, true);
                }
            }
            else
            {
                child = makeChild(
                    values[i], 
                    i < initialValues.Count ? initialValues[i] : null, 
                    flags);
                child.UpdateParentLink(parentControl, i, !noInitial);
            }
            newElements.Add(child);
        }
        
        if (noInitial && newElements.Count != existing.Count)
        {
            parentControl.Subscriptions?.ApplyChange(ControlChange.Structure);
        }
        
        if (newElements.Count < existing.Count)
        {
            for (int i = newElements.Count; i < existing.Count; i++)
            {
                existing[i].UpdateParentLink(parentControl, null);
            }
        }
        
        _elements = newElements;
    }

    public override void ValueChanged()
    {
        UpdateFromValue(_elements, true);
    }

    public override void InitialValueChanged()
    {
        UpdateFromValue(_elements, false, true);
    }

    public override void WithChildren(Action<IInternalControl> action)
    {
        foreach (var element in GetElements())
        {
            action(element);
        }
    }

    protected IList<object?> Copy(object? value)
    {
        if (value == null)
            return new List<object?>();
            
        if (value is IEnumerable enumerable)
            return enumerable.Cast<object?>().ToList();
            
        return new List<object?>();
    }

    public override void ChildValueChange(object prop, object? value)
    {
        if (prop is not int index)
            throw new ArgumentException("Property must be an integer for array controls", nameof(prop));
            
        var copied = Copy(Control.Value);
        if (index >= 0 && index < copied.Count)
        {
            copied[index] = value;
            Control.SetValueImpl(copied);
        }
    }

    public override bool ChildrenValid()
    {
        return _elements.All(element => element.IsValid());
    }
}