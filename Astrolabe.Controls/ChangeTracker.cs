namespace Astrolabe.Controls;

public class ChangeTracker : IDisposable
{
    private readonly Dictionary<IControl, ControlChange> _trackedAccess = new();
    private readonly Dictionary<IControl, ISubscription> _subscriptions = new();
    private Action? _changeCallback;
    private bool _callbackPending = false;

    /// <summary>
    /// Returns a tracking proxy for the given control that records property accesses.
    /// </summary>
    public IControlProperties<T> Tracked<T>(ITypedControl<T> control)
    {
        return new TrackedControlProxy<T>(control, this);
    }

    /// <summary>
    /// Tracks array elements and subscribes to Structure changes.
    /// Returns the current elements collection.
    /// </summary>
    public IReadOnlyList<IControl> TrackElements(IControl control)
    {
        RecordAccess(control, ControlChange.Structure);
        return control.Elements;
    }

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
            var subscription = control.UnderlyingControl.Subscribe(OnControlChanged, changeMask);
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

    internal void RecordAccess(IControl control, ControlChange changeType)
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

    /// <summary>
    /// Tracking proxy that records property accesses.
    /// </summary>
    private class TrackedControlProxy<T> : IControlProperties<T>
    {
        private readonly ITypedControl<T> _control;
        private readonly ChangeTracker _tracker;

        public TrackedControlProxy(ITypedControl<T> control, ChangeTracker tracker)
        {
            _control = control;
            _tracker = tracker;
        }

        public T Value
        {
            get
            {
                _tracker.RecordAccess(_control.UnderlyingControl, ControlChange.Value);
                return _control.Value;
            }
        }

        public T InitialValue
        {
            get
            {
                _tracker.RecordAccess(_control.UnderlyingControl, ControlChange.InitialValue);
                return _control.InitialValue;
            }
        }

        public bool IsDirty
        {
            get
            {
                _tracker.RecordAccess(_control.UnderlyingControl, ControlChange.Dirty);
                return _control.IsDirty;
            }
        }

        public bool IsDisabled
        {
            get
            {
                _tracker.RecordAccess(_control.UnderlyingControl, ControlChange.Disabled);
                return _control.IsDisabled;
            }
        }

        public bool IsTouched
        {
            get
            {
                _tracker.RecordAccess(_control.UnderlyingControl, ControlChange.Touched);
                return _control.IsTouched;
            }
        }

        public bool IsValid
        {
            get
            {
                _tracker.RecordAccess(_control.UnderlyingControl, ControlChange.Valid);
                return _control.IsValid;
            }
        }

        public IReadOnlyDictionary<string, string> Errors
        {
            get
            {
                _tracker.RecordAccess(_control.UnderlyingControl, ControlChange.Error);
                return _control.Errors;
            }
        }

        public bool IsUndefined => _control.IsUndefined;

        public bool HasErrors => _control.HasErrors;
    }
}
