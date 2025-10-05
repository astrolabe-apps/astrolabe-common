namespace Astrolabe.Controls;

public interface ISubscription : IDisposable
{
    ControlChange Mask { get; }
    ChangeListenerFunc Listener { get; }
}