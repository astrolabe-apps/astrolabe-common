namespace Astrolabe.Controls.Internal;

using System;
using System.Collections.Generic;
using System.Linq;

/// <summary>
/// Implementation of the IInternalControl interface.
/// </summary>
internal class ControlImpl(object? value, object? initialValue, ControlFlags flags, ControlLogic logic) : IControl

{
    private static readonly IReadOnlyDictionary<string, string> EmptyErrors = new Dictionary<string, string>();
    public Dictionary<string, string>? ErrorMap { get; set; }
    
    public object? Value { get; set; } = value;
    public object? InitialValue { get; set; } = initialValue;
    public ControlFlags Flags { get; set; } = flags;
    public ControlLogic Logic { get; private set; } = logic;
    public Subscriptions? Subscriptions { get; private set; }
    public IList<ParentLink>? Parents { get; set; }
    
    public IDictionary<string, object> Meta { get; } = new Dictionary<string, object>();

    public string? Error => ErrorMap?.Values.FirstOrDefault();

    public IReadOnlyDictionary<string, string> Errors => ErrorMap ?? EmptyErrors;

    public bool Valid => IsValid();

    public bool Dirty => !Logic.IsEqual(Value, InitialValue);

    public bool Disabled => (Flags & ControlFlags.Disabled) != 0;

    public bool Touched => (Flags & ControlFlags.Touched) != 0;

    public bool IsNull => Value == null;

    public IControl this[string propertyName] => GetField(propertyName);

    public IReadOnlyList<IControl> Elements => Logic.GetElements(this).Cast<IControl>().ToList();

    public void UpdateParentLink(ControlImpl parent, object? key, bool initial = false)
    {
        if (key == null)
        {
            if (Parents != null)
                Parents = Parents.Where(p => p.Control != parent).ToList();
            return;
        }

        var existing = Parents?.FirstOrDefault(p => p.Control == parent);
        if (existing != null)
        {
            existing.Key = key;
            if (initial)
                existing.OrigKey = key;
        }
        else
        {
            var newEntry = new ParentLink(parent, key, initial ? key : null);
            if (Parents == null)
                Parents = new List<ParentLink> { newEntry };
            else
                Parents.Add(newEntry);
        }
    }
    
    public void ValidityChanged(IControlTransactions ctx, bool hasErrors)
    {
        if (Parents != null)
        {
            foreach (var link in Parents)
            {
                var parentControl = link.Control;
                var alreadyInvalid = (parentControl.Flags & ControlFlags.ChildInvalid) != 0;
                
                if (!(hasErrors && alreadyInvalid))
                {
                    ctx.InTransaction(parentControl, () =>
                    {
                        if (hasErrors)
                            parentControl.Flags |= ControlFlags.ChildInvalid;
                        else
                            parentControl.Flags &= ~ControlFlags.ChildInvalid;
                        return true;
                    });
                }
                
                parentControl.ValidityChanged(ctx, hasErrors);
            }
        }
    }

    public bool Validate()
    {
        Logic.WithChildren(this, c => c.Validate());
        Subscriptions?.RunMatchingListeners(this, ControlChange.Validate);
        return Valid;
    }

    public ControlImpl GetField(string propertyName)
    {
        return Logic.GetField(this, propertyName);
    }

    public void SetValueImpl(IControlTransactions ctx, object? value, ControlImpl? from = null)
    {
        if (Logic.IsEqual(Value, value))
            return;

        ctx.InTransaction(this, () =>
        {
            var structureFlag = (value == null || Value == null)
                ? ControlChange.Structure
                : ControlChange.None;

            Value = value;

            if ((Flags & ControlFlags.DontClearError) == 0)
                ctx.SetErrors(this,null);

            Logic.ValueChanged(ctx, this);
        
            if (Parents != null)
            {
                foreach (var link in Parents)
                {
                    if (link.Control != from)
                        link.Control.Logic.ChildValueChange(ctx, this, link.Key, Value);
                }
            }
            Subscriptions?.ApplyChange(ControlChange.Value | structureFlag);
        });
    }

    public void SetInitialValueImpl(IControlTransactions ctx, object? value)
    {
        if (Logic.IsEqual(InitialValue, value))
            return;

        ctx.InTransaction(this, () =>
        {
            InitialValue = value;
            Logic.InitialValueChanged(ctx, this);
            Subscriptions?.ApplyChange(ControlChange.InitialValue);
            return true;
        });
    }


    public bool IsValid()
    {
        if (ErrorMap != null || (Flags & ControlFlags.ChildInvalid) != 0)
            return false;
            
        bool allChildrenValid = Logic.ChildrenValid();
        if (!allChildrenValid)
            Flags |= ControlFlags.ChildInvalid;
            
        return allChildrenValid;
    }

    public ControlChange GetChangeState(ControlChange mask)
    {
        var changeFlags = ControlChange.None;
        
        if ((mask & ControlChange.Dirty) != 0 && Dirty)
            changeFlags |= ControlChange.Dirty;
            
        if ((mask & ControlChange.Valid) != 0 && Valid)
            changeFlags |= ControlChange.Valid;
            
        if ((mask & ControlChange.Disabled) != 0 && Disabled)
            changeFlags |= ControlChange.Disabled;
            
        if ((mask & ControlChange.Touched) != 0 && Touched)
            changeFlags |= ControlChange.Touched;
            
        return changeFlags;
    }

    public ISubscription Subscribe(ChangeListenerFunc listener, ControlChange mask)
    {
        Subscriptions ??= new Subscriptions();
        var currentChanges = GetChangeState(mask);
        return Subscriptions.Subscribe(listener, currentChanges, mask);
    }

    public void Unsubscribe(ISubscription subscription)
    {
        Subscriptions?.Unsubscribe(subscription);
    }
    
    public void RunListeners()
    {
        if (Subscriptions != null)
        {
            var currentChanges = GetChangeState(Subscriptions.Mask);
            Subscriptions.RunListeners(this, currentChanges);
        }
    }

    public bool IsEqual(object? v1, object? v2)
    {
        return Logic.IsEqual(v1, v2);
    }
    
}
