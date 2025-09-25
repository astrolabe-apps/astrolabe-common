namespace Astrolabe.Controls;

public class ControlEditor
{
    private int _transactionDepth = 0;
    private readonly HashSet<IControl> _modifiedControls = new();

    public void RunInTransaction(Action action)
    {
        _transactionDepth++;
        try
        {
            action();
        }
        finally
        {
            _transactionDepth--;
            if (_transactionDepth == 0)
            {
                CommitChanges();
            }
        }
    }

    private void RunWithMutator(IControl control, Func<IControlMutation, bool> action)
    {
        RunInTransaction(() =>
        {
            if (control is not IControlMutation mutator) return;
            if (action(mutator))
            {
                _modifiedControls.Add(control);
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
        SetInitialValue(control, control.Value);
    }

    private void CommitChanges()
    {
        foreach (var control in _modifiedControls)
        {
            if (control is IControlMutation mutator)
            {
                mutator.RunListeners();
            }
        }
        _modifiedControls.Clear();
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

        RunInTransaction(() =>
        {
            if (control is Control concreteControl)
            {
                concreteControl.AddElementInternal(value);

                if (control is IControlMutation mutation)
                {
                    mutation.NotifyParentsOfChange();
                }
            }
        });
    }

    public void RemoveElement(IControl control, int index)
    {
        if (!control.IsArray) return;

        RunInTransaction(() =>
        {
            if (control is Control concreteControl)
            {
                concreteControl.RemoveElementInternal(index);

                if (control is IControlMutation mutation)
                {
                    mutation.NotifyParentsOfChange();
                }
            }
        });
    }
}