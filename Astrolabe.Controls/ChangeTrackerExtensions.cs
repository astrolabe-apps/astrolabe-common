using System.Linq.Expressions;
using System.Reflection;

namespace Astrolabe.Controls;

/// <summary>
/// Extension methods for ChangeTracker that provide convenient tracking patterns for IControl types.
/// </summary>
public static class ChangeTrackerExtensions
{
    /// <summary>
    /// Tracks a value from a control object, recording access only if a field control already exists.
    /// </summary>
    /// <typeparam name="T">The type of the control object</typeparam>
    /// <typeparam name="T2">The type of the property being accessed</typeparam>
    /// <param name="tracker">The change tracker</param>
    /// <param name="control">The control</param>
    /// <param name="selector">Expression selecting the property</param>
    /// <returns>The value of the selected property</returns>
    public static T2 TrackValue<T, T2>(this ChangeTracker tracker, IControl<T> control, Expression<Func<T, T2>> selector)
    {
        // Only record access if a field control already exists
        if (control.HaveField(selector))
        {
            var fieldControl = control.Field(selector);
            tracker.RecordAccess(fieldControl, ControlChange.Value);
        }
        // Get the value from the control's ValueT property
        return GetPropertyValue(control.ValueT, selector);
    }

    private static T2 GetPropertyValue<T, T2>(T obj, Expression<Func<T, T2>> selector)
    {
        var compiled = selector.Compile();
        return compiled(obj);
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
    /// Tracks the IsDirty property of a control's field.
    /// </summary>
    /// <typeparam name="T">The type of the control object</typeparam>
    /// <param name="tracker">The change tracker</param>
    /// <param name="control">The control</param>
    /// <param name="selector">Expression selecting the property</param>
    /// <returns>True if the property is dirty; otherwise false</returns>
    public static bool TrackIsDirty<T>(this ChangeTracker tracker, IControl<T> control, Expression<Func<T, object?>> selector)
    {
        if (control.HaveField(selector))
        {
            var fieldControl = control.Field(selector);
            tracker.RecordAccess(fieldControl, ControlChange.Dirty);
            return fieldControl.IsDirty;
        }
        return false;
    }

    /// <summary>
    /// Tracks the initial value of a control's field.
    /// </summary>
    /// <typeparam name="T">The type of the control object</typeparam>
    /// <typeparam name="T2">The type of the property being accessed</typeparam>
    /// <param name="tracker">The change tracker</param>
    /// <param name="control">The control</param>
    /// <param name="selector">Expression selecting the property</param>
    /// <returns>The initial value of the selected property</returns>
    public static T2 TrackInitialValue<T, T2>(this ChangeTracker tracker, IControl<T> control, Expression<Func<T, T2>> selector)
    {
        if (control.HaveField(selector))
        {
            var fieldControl = control.Field(selector);
            tracker.RecordAccess(fieldControl, ControlChange.InitialValue);
            return (T2)fieldControl.InitialValue!;
        }
        return GetPropertyValue(control.ValueT, selector);
    }

    /// <summary>
    /// Tracks the IsValid property of a control's field.
    /// </summary>
    /// <typeparam name="T">The type of the control object</typeparam>
    /// <param name="tracker">The change tracker</param>
    /// <param name="control">The control</param>
    /// <param name="selector">Expression selecting the property</param>
    /// <returns>True if the property is valid; otherwise false</returns>
    public static bool TrackIsValid<T>(this ChangeTracker tracker, IControl<T> control, Expression<Func<T, object?>> selector)
    {
        if (control.HaveField(selector))
        {
            var fieldControl = control.Field(selector);
            tracker.RecordAccess(fieldControl, ControlChange.Valid);
            return fieldControl.IsValid;
        }
        return true;
    }

    /// <summary>
    /// Tracks the IsTouched property of a control's field.
    /// </summary>
    /// <typeparam name="T">The type of the control object</typeparam>
    /// <param name="tracker">The change tracker</param>
    /// <param name="control">The control</param>
    /// <param name="selector">Expression selecting the property</param>
    /// <returns>True if the property is touched; otherwise false</returns>
    public static bool TrackIsTouched<T>(this ChangeTracker tracker, IControl<T> control, Expression<Func<T, object?>> selector)
    {
        if (control.HaveField(selector))
        {
            var fieldControl = control.Field(selector);
            tracker.RecordAccess(fieldControl, ControlChange.Touched);
            return fieldControl.IsTouched;
        }
        return false;
    }

    /// <summary>
    /// Tracks the IsDisabled property of a control's field.
    /// </summary>
    /// <typeparam name="T">The type of the control object</typeparam>
    /// <param name="tracker">The change tracker</param>
    /// <param name="control">The control</param>
    /// <param name="selector">Expression selecting the property</param>
    /// <returns>True if the property is disabled; otherwise false</returns>
    public static bool TrackIsDisabled<T>(this ChangeTracker tracker, IControl<T> control, Expression<Func<T, object?>> selector)
    {
        if (control.HaveField(selector))
        {
            var fieldControl = control.Field(selector);
            tracker.RecordAccess(fieldControl, ControlChange.Disabled);
            return fieldControl.IsDisabled;
        }
        return false;
    }

    /// <summary>
    /// Tracks the Errors property of a control's field.
    /// </summary>
    /// <typeparam name="T">The type of the control object</typeparam>
    /// <param name="tracker">The change tracker</param>
    /// <param name="control">The control</param>
    /// <param name="selector">Expression selecting the property</param>
    /// <returns>The errors dictionary for the property</returns>
    public static IReadOnlyDictionary<string, string> TrackErrors<T>(this ChangeTracker tracker, IControl<T> control, Expression<Func<T, object?>> selector)
    {
        if (control.HaveField(selector))
        {
            var fieldControl = control.Field(selector);
            tracker.RecordAccess(fieldControl, ControlChange.Error);
            return fieldControl.Errors;
        }
        return new Dictionary<string, string>();
    }
}
