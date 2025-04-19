namespace Astrolabe.Controls.Internal;

/// <summary>
/// Flags representing the state of a control.
/// </summary>
[Flags]
internal enum ControlFlags
{
    None = 0,
    Touched = 1,
    Disabled = 2,
    ChildInvalid = 4,
    DontClearError = 8,
    Undefined = 16
}

/// <summary>
/// Represents a link to a parent control.
/// </summary>
internal class ParentLink
{
    /// <summary>
    /// The parent control.
    /// </summary>
    public IControlImpl Control { get; set; }

    /// <summary>
    /// The key or index in the parent.
    /// </summary>
    public object Key { get; set; }

    /// <summary>
    /// The original key or index in the parent, if different.
    /// </summary>
    public object? OrigKey { get; set; }

    public ParentLink(IControlImpl control, object key, object? origKey = null)
    {
        Control = control;
        Key = key;
        OrigKey = origKey;
    }
}

/// <summary>
/// Base class for control logic implementations.
/// </summary>
internal interface ControlLogic
{
    bool IsEqual(object? v1, object? v2);

    T? VisitChildren<T>(Func<IControlImpl, T?> visitFn);

    IControl GetField(IControlImpl control, string propertyName);

    IReadOnlyList<IControl> GetElements(IControlImpl control);

    void ChildValueChange(
        IControlTransactions ctx,
        IControlImpl control,
        object prop,
        object? value
    );

    public object? GetValue(IControlImpl control);

    public void SetValue(IControlTransactions ctx, IControlImpl control, object? value);

    public void SetInitialValue(IControlTransactions ctx, IControlImpl control, object? value);
}
