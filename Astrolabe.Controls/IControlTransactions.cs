namespace Astrolabe.Controls;

public interface IControlTransactions
{
    T InTransaction<T>(IControl control, Func<T> func);
    void InTransaction(Action action);
    
    void InTransaction(IControl c, Action action);
    void AddAfterChangesCallback(Action action);
}