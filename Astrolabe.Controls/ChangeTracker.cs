namespace Astrolabe.Controls;

public class ChangeTracker : IDisposable
{
    private readonly Dictionary<IControl, ControlChange> _trackedAccess = new();
    private readonly Dictionary<IControl, ISubscription> _subscriptions = new();
    private Action? _changeCallback;
    private bool _callbackPending = false;

    /// <summary>
    /// Sets the callback to invoke when tracked dependencies change.
    /// </summary>
    public void SetCallback(Action callback)
    {
        _changeCallback = callback;
    }

    /// <summary>
    /// Updates subscriptions based on tracked property accesses since the last call.
    /// Clears tracked accesses after updating subscriptions.
    /// </summary>
    public void UpdateSubscriptions()
    {
        // 1. Add or update subscriptions for tracked controls
        foreach (var (control, changeMask) in _trackedAccess)
        {
            // Dispose old subscription if mask changed
            if (_subscriptions.TryGetValue(control, out var oldSub))
            {
                if (oldSub.Mask != changeMask)
                {
                    oldSub.Dispose();
                    _subscriptions.Remove(control);
                }
                else
                {
                    continue; // Subscription unchanged
                }
            }

            // Subscribe with the tracked change mask
            var subscription = control.Subscribe(OnControlChanged, changeMask);
            _subscriptions[control] = subscription;
        }

        // 2. Remove subscriptions for no-longer-tracked controls
        var toRemove = _subscriptions.Keys
            .Where(c => !_trackedAccess.ContainsKey(c))
            .ToList();
        foreach (var control in toRemove)
        {
            _subscriptions[control].Dispose();
            _subscriptions.Remove(control);
        }

        // 3. Clear tracked access for next evaluation
        _trackedAccess.Clear();
    }

    /// <summary>
    /// Disposes all active subscriptions and clears state.
    /// </summary>
    public void Dispose()
    {
        // Dispose all subscriptions
        foreach (var subscription in _subscriptions.Values)
            subscription.Dispose();

        // Clear all state
        _subscriptions.Clear();
        _trackedAccess.Clear();
        _changeCallback = null;
    }

    /// <summary>
    /// Records access to a control property for tracking purposes.
    /// This is used by extension methods to track property accesses.
    /// </summary>
    public void RecordAccess(IControl control, ControlChange changeType)
    {
        if (_trackedAccess.TryGetValue(control, out var existing))
        {
            // Combine with existing tracked changes
            _trackedAccess[control] = existing | changeType;
        }
        else
        {
            _trackedAccess[control] = changeType;
        }
    }

    private void OnControlChanged(IControl control, ControlChange changeType, ControlEditor editor)
    {
        if (_changeCallback != null && !_callbackPending)
        {
            _callbackPending = true;
            var callback = _changeCallback; // Capture current callback
            editor.RunAfterChanges(() => {
                try
                {
                    callback();
                }
                finally
                {
                    _callbackPending = false;
                }
            });
        }
    }
}
