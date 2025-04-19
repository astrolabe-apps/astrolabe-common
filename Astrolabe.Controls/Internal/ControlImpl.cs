namespace Astrolabe.Controls.Internal;

using System;
using System.Collections.Generic;
using System.Linq;

internal interface IControlImpl : IControl
{
    object? ValueImpl { get; set; }

    object? InitialValueImpl { get; set; }

    Dictionary<string, string>? ErrorMap { get; set; }
    public ControlFlags Flags { get; set; }

    public ControlLogic Logic { get; set; }

    public Subscriptions? Subscriptions { get; }

    void ValidityChanged(IControlTransactions ctx, bool hasErrors);

    void RunListeners();

    void WithChildren(Action<IControlImpl> action);

    void SetValueImpl(IControlTransactions ctx, object? value, IControlImpl? from = null);

    void SetInitialValueImpl(IControlTransactions ctx, object? value);

    void UpdateParentLink(IControlImpl parent, object? key, bool initial = false);

    internal static readonly IReadOnlyDictionary<string, string> EmptyErrors =
        new Dictionary<string, string>();

    internal void DoValueChange(
        IControlTransactions ctx,
        ControlChange structureFlag,
        IControlImpl? from = null
    );
}

/// <summary>
/// Implementation of the IInternalControl interface.
/// </summary>
internal class ControlImpl(
    object? value,
    object? initialValue,
    ControlFlags flags,
    ControlLogic logic
) : IControlImpl
{
    public Dictionary<string, string>? ErrorMap { get; set; }

    public object? ValueImpl { get; set; } = value;

    public object? InitialValueImpl { get; set; } = initialValue;

    public object? Value => Logic.GetValue(this);

    public object? InitialValue => InitialValueImpl;
    public ControlFlags Flags { get; set; } = flags;
    public ControlLogic Logic { get; set; } = logic;
    public Subscriptions? Subscriptions { get; private set; }
    public IList<ParentLink>? Parents { get; set; }

    public IDictionary<string, object> Meta { get; } = new Dictionary<string, object>();

    public string? Error => ErrorMap?.Values.FirstOrDefault();

    public IReadOnlyDictionary<string, string> Errors => ErrorMap ?? IControlImpl.EmptyErrors;

    public bool Valid => IsValid();

    public bool Dirty => !Logic.IsEqual(Value, InitialValue);

    public bool Disabled => (Flags & ControlFlags.Disabled) != 0;

    public bool Touched => (Flags & ControlFlags.Touched) != 0;

    public IControl this[string propertyName] => Logic.GetField(this, propertyName);

    public IReadOnlyList<IControl> Elements => Logic.GetElements(this);

    public void UpdateParentLink(IControlImpl parent, object? key, bool initial = false)
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
                    ctx.InTransaction(
                        parentControl,
                        () =>
                        {
                            if (hasErrors)
                                parentControl.Flags |= ControlFlags.ChildInvalid;
                            else
                                parentControl.Flags &= ~ControlFlags.ChildInvalid;
                            return true;
                        }
                    );
                }

                parentControl.ValidityChanged(ctx, hasErrors);
            }
        }
    }

    public bool Validate()
    {
        Logic.WithChildren(c => c.Validate());
        Subscriptions?.RunMatchingListeners(this, ControlChange.Validate);
        return Valid;
    }

    public void SetValueImpl(IControlTransactions ctx, object? value, IControlImpl? from = null)
    {
        if (Logic.IsEqual(Value, value) && (Flags & ControlFlags.Undefined) == 0)
            return;

        ctx.InTransaction(
            this,
            () =>
            {
                var structureFlag =
                    (value == null || Value == null) ? ControlChange.Structure : ControlChange.None;
                Flags &= ~ControlFlags.Undefined;
                Logic.SetValue(ctx, this, value);

                DoValueChange(ctx, structureFlag, from);
            }
        );
    }

    public void DoValueChange(
        IControlTransactions ctx,
        ControlChange structureFlag,
        IControlImpl? from = null
    )
    {
        if ((Flags & ControlFlags.DontClearError) == 0)
            ctx.SetErrors(this, null);

        if (Parents != null)
        {
            foreach (var link in Parents)
            {
                if (link.Control != from)
                    link.Control.Logic.ChildValueChange(ctx, link.Control, link.Key, Value);
            }
        }
        Subscriptions?.ApplyChange(ControlChange.Value | structureFlag);
    }

    public void SetInitialValueImpl(IControlTransactions ctx, object? value)
    {
        if (Logic.IsEqual(InitialValue, value))
            return;

        ctx.InTransaction(
            this,
            () =>
            {
                Logic.SetInitialValue(ctx, this, value);
                Subscriptions?.ApplyChange(ControlChange.InitialValue);
                return true;
            }
        );
    }

    private bool IsValid()
    {
        if (ErrorMap != null || (Flags & ControlFlags.ChildInvalid) != 0)
            return false;

        var allChildrenValid = Logic.VisitChildren(c => c.Valid ? (bool?)null : false) ?? true;
        if (!allChildrenValid)
            Flags |= ControlFlags.ChildInvalid;

        return allChildrenValid;
    }

    private ControlChange GetChangeState(ControlChange mask)
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

    public void ChildValueChange(
        IControlTransactions ctx,
        IControlImpl control,
        object prop,
        object? value
    )
    {
        Logic.ChildValueChange(ctx, control, prop, value);
    }

    public void WithChildren(Action<IControlImpl> action)
    {
        Logic.WithChildren(action);
    }

    public bool IsEqual(object? v1, object? v2)
    {
        return Logic.IsEqual(v1, v2);
    }
}
