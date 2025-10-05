namespace Astrolabe.Controls;

internal class Subscription : ISubscription
{
    public ControlChange Mask { get; }
    public ChangeListenerFunc Listener { get; }
    internal SubscriptionList ParentList { get; }

    public Subscription(ChangeListenerFunc listener, ControlChange mask, SubscriptionList parentList)
    {
        Listener = listener;
        Mask = mask;
        ParentList = parentList;
    }

    public void Dispose() => ParentList.Remove(this);
}