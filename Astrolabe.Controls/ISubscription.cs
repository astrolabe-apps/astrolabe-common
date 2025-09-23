namespace Astrolabe.Controls;

public interface ISubscription
{
    ControlChange Mask { get; }
    ChangeListenerFunc Listener { get; }
    void Unsubscribe();
}