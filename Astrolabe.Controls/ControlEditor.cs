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

    public void SetValue(IControl control, object? value)
    {
        if (_transactionDepth > 0)
        {
            // In transaction - defer notifications
            if (control is IControlMutation mutator)
            {
                // Only track if value actually changed
                if (mutator.SetValueInternal(value))
                {
                    _modifiedControls.Add(control);
                }
            }
        }
        else
        {
            // Auto-wrap in transaction for convenience
            RunInTransaction(() => SetValue(control, value));
        }
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