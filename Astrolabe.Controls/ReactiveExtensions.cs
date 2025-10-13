using System.Linq.Expressions;

namespace Astrolabe.Controls;

/// <summary>
/// Extension methods for IReactive<T>
/// </summary>
public static class ReactiveExtensions
{
    /// <summary>
    /// Accesses a field (property) of a reactive object.
    /// Returns the control for the specified field.
    /// </summary>
    /// <typeparam name="T">The type of the reactive object</typeparam>
    /// <typeparam name="TField">The type of the field being accessed</typeparam>
    /// <param name="reactive">The reactive wrapper</param>
    /// <param name="fieldSelector">Expression selecting the field (e.g., x => x.FieldName)</param>
    /// <returns>The control for the specified field</returns>
    public static IControl Field<T, TField>(
        this IReactive<T> reactive,
        Expression<Func<T, TField>> fieldSelector)
    {
        return reactive.GetControl(fieldSelector);
    }

    /// <summary>
    /// Makes a reactive property computed by setting up a reactive computation that updates its value.
    /// The compute function is called initially and whenever any tracked dependencies change.
    /// </summary>
    /// <typeparam name="T">The type of the reactive object</typeparam>
    /// <typeparam name="TField">The type of the property value</typeparam>
    /// <param name="reactive">The reactive wrapper</param>
    /// <param name="fieldSelector">Expression selecting the field to make computed</param>
    /// <param name="compute">Function that computes the value, receiving a ChangeTracker to track dependencies</param>
    /// <param name="editor">ControlEditor instance to use for updates</param>
    public static void MakeComputed<T, TField>(
        this IReactive<T> reactive,
        Expression<Func<T, TField>> fieldSelector,
        Func<ChangeTracker, TField> compute,
        ControlEditor editor)
    {
        var control = reactive.GetControl(fieldSelector);
        Control<object?>.MakeComputed(control, compute, editor);
    }

    /// <summary>
    /// Makes a reactive property computed by setting up a reactive computation that updates its value.
    /// Unlike MakeComputed, this version passes the current value to the compute function,
    /// allowing you to reuse or transform the existing value rather than creating a new one from scratch.
    /// </summary>
    /// <typeparam name="T">The type of the reactive object</typeparam>
    /// <typeparam name="TField">The type of the property value</typeparam>
    /// <param name="reactive">The reactive wrapper</param>
    /// <param name="fieldSelector">Expression selecting the field to make computed</param>
    /// <param name="compute">Function that computes the value, receiving a ChangeTracker and current value</param>
    /// <param name="editor">ControlEditor instance to use for updates</param>
    public static void MakeComputedWithPrevious<T, TField>(
        this IReactive<T> reactive,
        Expression<Func<T, TField>> fieldSelector,
        Func<ChangeTracker, TField, TField> compute,
        ControlEditor editor)
    {
        var control = reactive.GetControl(fieldSelector);
        Control<object?>.MakeComputedWithPrevious(control, compute, editor);
    }
}
