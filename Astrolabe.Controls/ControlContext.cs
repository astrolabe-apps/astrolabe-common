using Astrolabe.Controls.Internal;

namespace Astrolabe.Controls;

public record ControlContext(IControlTransactions Transactions, ChangeListenerFunc? Tracker) : IControlTransactions
{
    public static ControlContext Create() => new(new ControlTransactions(), null);
    public T InTransaction<T>(IControl control, Func<T> func)
    {
        return Transactions.InTransaction(control, func);
    }

    public void InTransaction(Action action)
    {
        Transactions.InTransaction(action);
    }

    public void InTransaction(IControl c, Action action)
    {
        Transactions.InTransaction(c, action);
    }

    public void AddAfterChangesCallback(Action action)
    {
        Transactions.AddAfterChangesCallback(action);
    }
}