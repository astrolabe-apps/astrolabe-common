using System;
using System.Collections.Generic;
using System.Linq;

namespace Astrolabe.Controls.Internal;

/// <summary>
/// Implementation of the IInternalControl interface.
/// </summary>
internal class ControlImpl : IInternalControl
{
    private Dictionary<string, string>? _errors;
    public object? Value { get; set; }
    public object? InitialValue { get; set; }
    public ControlFlags Flags { get; set; }
    public ControlLogic Logic { get; private set; }
    public Subscriptions? Subscriptions { get; private set; }
    public IList<ParentLink>? Parents { get; set; }
    public IDictionary<string, object> Meta { get; } = new Dictionary<string, object>();

    public string? Error => _errors?.Values.FirstOrDefault();

    public IReadOnlyDictionary<string, string> Errors => _errors ?? new Dictionary<string, string>();

    public bool Valid => IsValid();

    public bool Dirty => !Logic.IsEqual(Value, InitialValue);

    public bool Disabled
    {
        get => (Flags & ControlFlags.Disabled) != 0;
        set => SetDisabled(value);
    }

    public bool Touched
    {
        get => (Flags & ControlFlags.Touched) != 0;
        set => SetTouched(value);
    }

    public bool IsNull => Value == null;

    public IControl this[string propertyName] => GetField(propertyName);

    public IReadOnlyList<IControl> Elements => Logic.GetElements().Cast<IControl>().ToList();

    public ControlImpl(object? value, object? initialValue, ControlFlags flags, ControlLogic logic)
    {
        Value = value;
        InitialValue = initialValue;
        Flags = flags;
        Logic = logic;
        Logic.Attach(this);
    }

    public IControl? LookupControl(IEnumerable<object> path)
    {
        IControl? baseControl = this;
        foreach (var childId in path)
        {
            if (baseControl == null)
                return null;

            if (childId is string propertyName)
            {
                baseControl = baseControl[propertyName];
            }
            else if (childId is int index)
            {
                if (index < 0 || index >= baseControl.Elements.Count)
                    return null;
                    
                baseControl = baseControl.Elements[index];
            }
            else
            {
                return null;
            }
        }
        
        return baseControl;
    }

    public void UpdateParentLink(IInternalControl parent, object? key, bool initial = false)
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

    public void ValueChanged(IInternalControl? from = null)
    {
        Logic.ValueChanged();
        
        if (Parents != null)
        {
            foreach (var link in Parents)
            {
                if (link.Control != from)
                    link.Control.Logic.ChildValueChange(link.Key, Value);
            }
        }
    }

    public void ValidityChanged(bool hasErrors)
    {
        if (Parents != null)
        {
            foreach (var link in Parents)
            {
                var parentControl = link.Control;
                var alreadyInvalid = (parentControl.Flags & ControlFlags.ChildInvalid) != 0;
                
                if (!(hasErrors && alreadyInvalid))
                {
                    using (new Transaction(parentControl))
                    {
                        if (hasErrors)
                            parentControl.Flags |= ControlFlags.ChildInvalid;
                        else
                            parentControl.Flags &= ~ControlFlags.ChildInvalid;
                    }
                }
                
                parentControl.ValidityChanged(hasErrors);
            }
        }
    }

    public bool Validate()
    {
        Logic.WithChildren(c => c.Validate());
        Subscriptions?.RunMatchingListeners(this, ControlChange.Validate);
        return Valid;
    }

    public IInternalControl GetField(string propertyName)
    {
        return Logic.GetField(propertyName);
    }

    public void SetTouched(bool touched, bool notChildren = false)
    {
        using (new Transaction(this))
        {
            if (touched)
                Flags |= ControlFlags.Touched;
            else
                Flags &= ~ControlFlags.Touched;
                
            if (!notChildren)
                Logic.WithChildren(c => c.SetTouched(touched));
        }
    }

    public void SetDisabled(bool disabled, bool notChildren = false)
    {
        using (new Transaction(this))
        {
            if (disabled)
                Flags |= ControlFlags.Disabled;
            else
                Flags &= ~ControlFlags.Disabled;
                
            if (!notChildren)
                Logic.WithChildren(c => c.SetDisabled(disabled));
        }
    }

    public void SetValueImpl(object? value, IInternalControl? from = null)
    {
        if (Logic.IsEqual(Value, value))
            return;
            
        using (new Transaction(this))
        {
            var structureFlag = (value == null || Value == null)
                ? ControlChange.Structure
                : ControlChange.None;
                
            Value = value;
            
            if ((Flags & ControlFlags.DontClearError) == 0)
                SetErrors(null);
                
            ValueChanged(from);
            Subscriptions?.ApplyChange(ControlChange.Value | structureFlag);
        }
    }

    public void SetInitialValueImpl(object? value)
    {
        if (Logic.IsEqual(InitialValue, value))
            return;
            
        using (new Transaction(this))
        {
            InitialValue = value;
            Logic.InitialValueChanged();
            Subscriptions?.ApplyChange(ControlChange.InitialValue);
        }
    }

    public bool IsValid()
    {
        if (_errors != null || (Flags & ControlFlags.ChildInvalid) != 0)
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

    public void MarkAsClean()
    {
        SetInitialValueImpl(Value);
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

    public void SetError(string key, string? error)
    {
        using (new Transaction(this))
        {
            bool hadErrors = _errors != null;
            
            if (string.IsNullOrEmpty(error))
                error = null;
                
            if (_errors != null && _errors.TryGetValue(key, out var currentError) && currentError == error)
                return;
                
            if (error != null)
            {
                if (_errors == null)
                    _errors = new Dictionary<string, string> { [key] = error };
                else
                    _errors[key] = error;
            }
            else if (_errors != null)
            {
                if (_errors.Count == 1 && _errors.ContainsKey(key))
                    _errors = null;
                else
                    _errors.Remove(key);
            }
            
            bool hasErrors = _errors != null;
            if (hadErrors != hasErrors)
                ValidityChanged(hasErrors);
                
            Subscriptions?.ApplyChange(ControlChange.Error);
        }
    }

    public void SetErrors(Dictionary<string, string?>? errors)
    {
        if (_errors == null && errors == null)
            return;
            
        using (new Transaction(this))
        {
            var realErrors = errors?
                .Where(x => !string.IsNullOrEmpty(x.Value))
                .ToDictionary(x => x.Key, x => x.Value!);
                
            Dictionary<string, string>? exactErrors = 
                realErrors != null && realErrors.Count > 0 ? realErrors : null;
                
            if (!DictionaryEquals(exactErrors, _errors))
            {
                _errors = exactErrors;
                ValidityChanged(exactErrors != null);
                Subscriptions?.ApplyChange(ControlChange.Error);
            }
        }
    }

    public void ClearErrors()
    {
        using (new Transaction(this))
        {
            Logic.WithChildren(c => c.ClearErrors());
            SetErrors(null);
        }
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

    public void SetValue(Func<object?, object?> updateFunc)
    {
        SetValueImpl(updateFunc(Value));
    }

    public void SetValueAndInitial(object? value, object? initialValue)
    {
        using (GroupedChanges.Create())
        {
            Value = value;
            InitialValue = initialValue;
        }
    }

    public void SetInitialValue(object? value)
    {
        SetValueAndInitial(value, value);
    }

    // Helper method to compare dictionaries
    private bool DictionaryEquals<TKey, TValue>(
        Dictionary<TKey, TValue>? dict1,
        Dictionary<TKey, TValue>? dict2) where TKey : notnull
    {
        if (dict1 == dict2)
            return true;
            
        if (dict1 == null || dict2 == null)
            return false;
            
        if (dict1.Count != dict2.Count)
            return false;
            
        return dict1.All(kvp => 
            dict2.TryGetValue(kvp.Key, out var value) && 
            EqualityComparer<TValue>.Default.Equals(kvp.Value, value));
    }
}

/// <summary>
/// Provides transaction support for control operations.
/// </summary>
internal class Transaction : IDisposable
{
    private readonly IInternalControl _control;
    private static int _transactionCount = 0;
    private static List<IInternalControl> _runListenerList = new();
    private static List<Action> _afterChangesCallbacks = new();

    public Transaction(IInternalControl control)
    {
        _control = control;
        _transactionCount++;
    }

    public void Dispose()
    {
        _transactionCount--;
        
        var subscriptions = _control.Subscriptions;
        if (_transactionCount > 0)
        {
            if (subscriptions != null && !subscriptions.OnListenerList)
            {
                subscriptions.OnListenerList = true;
                _runListenerList.Add(_control);
            }
        }
        else
        {
            if (!_runListenerList.Any() && subscriptions != null)
            {
                _control.RunListeners();
            }
            else if (subscriptions != null)
            {
                _runListenerList.Add(_control);
            }
            
            RunPendingChanges();
        }
    }

    private static void RunPendingChanges()
    {
        while (_transactionCount == 0 && 
              (_afterChangesCallbacks.Count > 0 || _runListenerList.Count > 0))
        {
            try
            {
                _transactionCount++;
                
                if (_runListenerList.Count == 0)
                {
                    var callbacks = _afterChangesCallbacks.ToList();
                    _afterChangesCallbacks.Clear();
                    foreach (var callback in callbacks)
                    {
                        callback();
                    }
                }
                else
                {
                    var listeners = _runListenerList.ToList();
                    _runListenerList.Clear();
                    
                    foreach (var control in listeners)
                    {
                        if (control.Subscriptions != null)
                            control.Subscriptions.OnListenerList = false;
                    }
                    
                    foreach (var control in listeners)
                    {
                        control.RunListeners();
                    }
                }
            }
            finally
            {
                _transactionCount--;
            }
        }
    }

    public static void AddAfterChangesCallback(Action callback)
    {
        _afterChangesCallbacks.Add(callback);
    }
}

/// <summary>
/// Provides support for grouping changes.
/// </summary>
internal class GroupedChanges : IDisposable
{
    public static GroupedChanges Create()
    {
        return new GroupedChanges();
    }

    private GroupedChanges()
    {
        Transaction.AddAfterChangesCallback(() => _transactionCount++);
    }

    private static int _transactionCount = 0;

    public void Dispose()
    {
        _transactionCount--;
        if (_transactionCount == 0)
        {
            // Run any pending changes
        }
    }
}