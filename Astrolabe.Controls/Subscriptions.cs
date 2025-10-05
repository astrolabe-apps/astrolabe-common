namespace Astrolabe.Controls;

public class Subscriptions
{
    private readonly List<SubscriptionList> _lists = new();

    public ControlChange Mask { get; private set; } = ControlChange.None;
    public bool OnListenerList { get; set; }
    internal IReadOnlyList<SubscriptionList> Lists => _lists.AsReadOnly();

    public ISubscription Subscribe(
        ChangeListenerFunc listener,
        ControlChange current,
        ControlChange mask)
    {
        var list = _lists.FirstOrDefault(x => x.CanBeAdded(current, mask));
        if (list == null)
        {
            list = new SubscriptionList(current, mask);
            _lists.Add(list);
        }

        Mask |= mask;
        return list.Add(listener, mask);
    }

    public bool HasSubscriptions()
    {
        return _lists.Any(list => list.HasSubscriptions);
    }

    public void RunListeners(IControl control, ControlChange current, ControlEditor editor)
    {
        foreach (var list in _lists)
        {
            list.RunListeners(control, current, editor);
        }
    }

    public void RunMatchingListeners(IControl control, ControlChange mask, ControlEditor editor)
    {
        foreach (var list in _lists)
        {
            list.RunMatchingListeners(control, mask, editor);
        }
    }

    public void ApplyChange(ControlChange change)
    {
        foreach (var list in _lists)
        {
            list.ApplyChange(change);
        }
    }
}