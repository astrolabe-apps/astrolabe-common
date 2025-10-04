namespace Astrolabe.Controls;

public class ChangeTracker
{
    public T TrackChanges<T>(Func<IControlReader, T> readControls)
    {
        // TODO implement
        throw new NotImplementedException();
    }

    public void UpdateSubscriptions(Action changedCallback)
    {
        // subscribe or unsubscribe from controls
        // Call the changed callback whenever anything called with TrackChanges
        // TODO implement
    }

    public void Dispose()
    {
        // unsubscribe from all subscriptions
    }
}

public interface IControlReader
{
    object? GetValue(IControl control);

    object? GetInitialValue(IControl control);

    bool IsDirty(IControl control);

    // etc GetError(), GetErrors() ...
}