namespace Astrolabe.Controls;

public class ControlEditor
{
    private int _transactionCount = 0;
    private readonly List<IControl> _runListenerList = new();
    private readonly List<Action> _afterChangesCallbacks = new();

    public void RunInTransaction(Action action)
    {
        _transactionCount++;
        try
        {
            action();
        }
        finally
        {
            _transactionCount--;
            if (_transactionCount == 0)
            {
                RunPendingChanges();
            }
        }
    }

    /// <summary>
    /// Runs the callback after all listeners have been notified in the current transaction.
    /// </summary>
    public void RunAfterChanges(Action callback)
    {
        _afterChangesCallbacks.Add(callback);
    }

    internal void AddToRunListenerList(IControl control)
    {
        if (!_runListenerList.Contains(control))
        {
            _runListenerList.Add(control);
        }
    }

    private void RunWithMutator(IControl control, Func<IControlMutation, bool> action)
    {
        RunInTransaction(() =>
        {
            if (control is not IControlMutation mutator) return;
            if (action(mutator))
            {
                AddToRunListenerList(control);
            }
        });
    }

    public void SetValue(IControl control, object? value)
    {
        RunWithMutator(control, x => x.SetValueInternal(this, value));
    }

    public void SetInitialValue(IControl control, object? initialValue)
    {
        RunWithMutator(control, x => x.SetInitialValueInternal(this, initialValue));
    }

    public void SetDisabled(IControl control, bool disabled)
    {
        RunWithMutator(control, x => x.SetDisabledInternal(this, disabled));
    }

    public void SetTouched(IControl control, bool touched)
    {
        RunWithMutator(control, x => x.SetTouchedInternal(this, touched));
    }

    public void MarkAsClean(IControl control)
    {
        SetInitialValue(control, control.ValueObject);
    }

    private void RunPendingChanges()
    {
        // Matches TypeScript runPendingChanges() logic
        while (_transactionCount == 0 &&
               (_afterChangesCallbacks.Count > 0 || _runListenerList.Count > 0))
        {
            try
            {
                _transactionCount++; // Prevent re-entry

                if (_runListenerList.Count == 0)
                {
                    // Only callbacks left to run
                    var callbacksToRun = _afterChangesCallbacks.ToList();
                    _afterChangesCallbacks.Clear();
                    foreach (var callback in callbacksToRun)
                    {
                        callback();
                    }
                }
                else
                {
                    // Run listeners first
                    var listenersToRun = _runListenerList.ToList();
                    _runListenerList.Clear();
                    foreach (var control in listenersToRun)
                    {
                        if (control is IControlMutation mutator)
                        {
                            mutator.RunListeners(this);
                        }
                    }
                }
            }
            finally
            {
                _transactionCount--;
            }
        }
    }

    // Array/Object operations
    public void SetField(IControl control, string fieldName, object? value)
    {
        var fieldControl = control[fieldName];
        if (fieldControl != null)
            SetValue(fieldControl, value);
    }

    public void SetElement(IControl control, int index, object? value)
    {
        var elementControl = control[index];
        if (elementControl != null)
            SetValue(elementControl, value);
    }

    public void AddElement(IControl control, object? value)
    {
        if (!control.IsArray) return;

        RunWithMutator(control, (mutate) =>
        {
            mutate.AddElementInternal(value);
            mutate.NotifyParentsOfChange();
            return true;
        });
    }

    public void RemoveElement(IControl control, int index)
    {
        if (!control.IsArray) return;

        RunWithMutator(control, (mutate) =>
        {
            mutate.RemoveElementInternal(index);
            mutate.NotifyParentsOfChange();
            return true;
        });
    }

    // Error management methods
    public void SetErrors(IControl control, IDictionary<string, string> errors)
    {
        RunWithMutator(control, x => x.SetErrorsInternal(this, errors));
    }

    public void SetError(IControl control, string key, string? message)
    {
        RunWithMutator(control, x => x.SetErrorInternal(this, key, message));
    }

    public void ClearErrors(IControl control)
    {
        RunWithMutator(control, x => x.ClearErrorsInternal(this));
    }

    // Internal method for validity change notifications
    internal void AddToModifiedControls(IControl control)
    {
        AddToRunListenerList(control);
    }

    // Validation methods
    /// <summary>
    /// Validates a single control and all its children
    /// </summary>
    public bool Validate(IControl control)
    {
        RunInTransaction(() =>
        {
            if (control is IControlMutation mutation)
            {
                mutation.RunValidationListeners(this);
            }
        });
        return control.IsValid;
    }
}