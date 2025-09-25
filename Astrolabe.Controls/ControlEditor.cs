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
}