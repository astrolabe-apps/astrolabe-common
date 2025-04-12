namespace Astrolabe.Controls.Internal;

internal class ControlTransactions : IControlTransactions
{
    private int _transactionCount;
    private readonly HashSet<IControlImpl> _runListenerList = [];
    private readonly List<Action> _afterChangesCallbacks = [];
    
    private void FinishTransaction(IControlImpl c)
    {
        _transactionCount--;

        var subscriptions = c.Subscriptions;
        if (_transactionCount > 0)
        {
            _runListenerList.Add(c);
        }
        else
        {
            if (_runListenerList.Count == 0 && subscriptions != null)
            {
                c.RunListeners();
            }
            else if (subscriptions != null)
            {
                _runListenerList.Add(c);
            }

            RunPendingChanges();
        }
    }

    private void RunPendingChanges()
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

    public T InTransaction<T>(IControl control, Func<T> func)
    {
        _transactionCount++;
        try
        {
            return func();
        }
        finally
        {
            FinishTransaction((IControlImpl) control);
        }
    }

    public void InTransaction(Action action)
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

    public void InTransaction(IControl c, Action action)
    {
        _transactionCount++;
        try
        {
            action();
        }
        finally
        {
            FinishTransaction((IControlImpl) c);
        }
    }

    public void AddAfterChangesCallback(Action action)
    {
        _afterChangesCallbacks.Add(action);
    }
}