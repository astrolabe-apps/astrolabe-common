namespace Astrolabe.Controls;

public class ChangeTracker : IDisposable
{
    public IControlProperties<T> Tracked<T>(ITypedControl<T> control)
    {
        // wrap control with a proxy that tracks which ControlChanges flags to listen to
        throw new NotImplementedException();
    }

    public void UpdateSubscriptions(Action changedCallback)
    {
        // subscribe or unsubscribe from controls
        // Call the changed callback whenever *any* of the subscriptions fires
        // TODO implement
    }

    public void Dispose()
    {
        // unsubscribe from all subscriptions
    }
}
