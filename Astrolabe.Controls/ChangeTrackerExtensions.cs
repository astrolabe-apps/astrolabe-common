using System.Linq.Expressions;

namespace Astrolabe.Controls;

/// <summary>
/// Extension methods for ChangeTracker that provide convenient tracking patterns for IReactive types.
/// </summary>
public static class ChangeTrackerExtensions
{
    /// <summary>
    /// Tracks a value from a reactive object, recording access only if a control already exists.
    /// </summary>
    /// <typeparam name="T">The type of the reactive object</typeparam>
    /// <typeparam name="T2">The type of the property being accessed</typeparam>
    /// <param name="tracker">The change tracker</param>
    /// <param name="reactive">The reactive wrapper</param>
    /// <param name="selector">Expression selecting the property</param>
    /// <returns>The value of the selected property</returns>
    public static T2 TrackValue<T, T2>(this ChangeTracker tracker, IReactive<T> reactive, Expression<Func<T, T2>> selector)
    {
        // Only record access if a control already exists
        if (reactive.HaveControl(selector))
        {
            var control = reactive.GetControl(selector);
            tracker.RecordAccess(control, ControlChange.Value);
        }
        return reactive.Get(selector);
    }

    /// <summary>
    /// Tracks array elements and subscribes to Structure changes.
    /// </summary>
    /// <param name="tracker">The change tracker</param>
    /// <param name="control">The array control</param>
    /// <returns>The current elements collection</returns>
    public static IReadOnlyList<IControl> TrackElements(this ChangeTracker tracker, IControl control)
    {
        tracker.RecordAccess(control, ControlChange.Structure);
        return control.Elements;
    }

    /// <summary>
    /// Tracks the IsDirty property of a reactive object's property.
    /// </summary>
    /// <typeparam name="T">The type of the reactive object</typeparam>
    /// <param name="tracker">The change tracker</param>
    /// <param name="reactive">The reactive wrapper</param>
    /// <param name="selector">Expression selecting the property</param>
    /// <returns>True if the property is dirty; otherwise false</returns>
    public static bool TrackIsDirty<T>(this ChangeTracker tracker, IReactive<T> reactive, Expression<Func<T, object?>> selector)
    {
        if (reactive.HaveControl(selector))
        {
            var control = reactive.GetControl(selector);
            tracker.RecordAccess(control, ControlChange.Dirty);
            return control.IsDirty;
        }
        return false;
    }

    /// <summary>
    /// Tracks the initial value of a reactive object's property.
    /// </summary>
    /// <typeparam name="T">The type of the reactive object</typeparam>
    /// <typeparam name="T2">The type of the property being accessed</typeparam>
    /// <param name="tracker">The change tracker</param>
    /// <param name="reactive">The reactive wrapper</param>
    /// <param name="selector">Expression selecting the property</param>
    /// <returns>The initial value of the selected property</returns>
    public static T2 TrackInitialValue<T, T2>(this ChangeTracker tracker, IReactive<T> reactive, Expression<Func<T, T2>> selector)
    {
        if (reactive.HaveControl(selector))
        {
            var control = reactive.GetControl(selector);
            tracker.RecordAccess(control, ControlChange.InitialValue);
            return (T2)control.InitialValue!;
        }
        return reactive.Get(selector);
    }

    /// <summary>
    /// Tracks the IsValid property of a reactive object's property.
    /// </summary>
    /// <typeparam name="T">The type of the reactive object</typeparam>
    /// <param name="tracker">The change tracker</param>
    /// <param name="reactive">The reactive wrapper</param>
    /// <param name="selector">Expression selecting the property</param>
    /// <returns>True if the property is valid; otherwise false</returns>
    public static bool TrackIsValid<T>(this ChangeTracker tracker, IReactive<T> reactive, Expression<Func<T, object?>> selector)
    {
        if (reactive.HaveControl(selector))
        {
            var control = reactive.GetControl(selector);
            tracker.RecordAccess(control, ControlChange.Valid);
            return control.IsValid;
        }
        return true;
    }

    /// <summary>
    /// Tracks the IsTouched property of a reactive object's property.
    /// </summary>
    /// <typeparam name="T">The type of the reactive object</typeparam>
    /// <param name="tracker">The change tracker</param>
    /// <param name="reactive">The reactive wrapper</param>
    /// <param name="selector">Expression selecting the property</param>
    /// <returns>True if the property is touched; otherwise false</returns>
    public static bool TrackIsTouched<T>(this ChangeTracker tracker, IReactive<T> reactive, Expression<Func<T, object?>> selector)
    {
        if (reactive.HaveControl(selector))
        {
            var control = reactive.GetControl(selector);
            tracker.RecordAccess(control, ControlChange.Touched);
            return control.IsTouched;
        }
        return false;
    }

    /// <summary>
    /// Tracks the IsDisabled property of a reactive object's property.
    /// </summary>
    /// <typeparam name="T">The type of the reactive object</typeparam>
    /// <param name="tracker">The change tracker</param>
    /// <param name="reactive">The reactive wrapper</param>
    /// <param name="selector">Expression selecting the property</param>
    /// <returns>True if the property is disabled; otherwise false</returns>
    public static bool TrackIsDisabled<T>(this ChangeTracker tracker, IReactive<T> reactive, Expression<Func<T, object?>> selector)
    {
        if (reactive.HaveControl(selector))
        {
            var control = reactive.GetControl(selector);
            tracker.RecordAccess(control, ControlChange.Disabled);
            return control.IsDisabled;
        }
        return false;
    }

    /// <summary>
    /// Tracks the Errors property of a reactive object's property.
    /// </summary>
    /// <typeparam name="T">The type of the reactive object</typeparam>
    /// <param name="tracker">The change tracker</param>
    /// <param name="reactive">The reactive wrapper</param>
    /// <param name="selector">Expression selecting the property</param>
    /// <returns>The errors dictionary for the property</returns>
    public static IReadOnlyDictionary<string, string> TrackErrors<T>(this ChangeTracker tracker, IReactive<T> reactive, Expression<Func<T, object?>> selector)
    {
        if (reactive.HaveControl(selector))
        {
            var control = reactive.GetControl(selector);
            tracker.RecordAccess(control, ControlChange.Error);
            return control.Errors;
        }
        return new Dictionary<string, string>();
    }
}
