using System;
using System.Collections.Generic;

namespace Astrolabe.Controls;

/// <summary>
/// Flags representing different types of control changes.
/// </summary>
[Flags]
public enum ControlChange
{
    None = 0,
    Valid = 1,
    Touched = 2,
    Dirty = 4,
    Disabled = 8,
    Value = 16,
    InitialValue = 32,
    Error = 64,
    All = Value | Valid | Touched | Disabled | Error | Dirty | InitialValue,
    Structure = 128,
    Validate = 256
}

/// <summary>
/// Delegate for change listeners that are notified when control properties change.
/// </summary>
/// <param name="control">The control that changed.</param>
/// <param name="change">The type of change that occurred.</param>
public delegate void ChangeListenerFunc(IControl control, ControlChange change);

/// <summary>
/// Represents a subscription to control changes.
/// </summary>
public interface ISubscription
{
    /// <summary>
    /// The mask of change types this subscription is listening for.
    /// </summary>
    ControlChange Mask { get; }

    /// <summary>
    /// The listener function to be called when changes occur.
    /// </summary>
    ChangeListenerFunc Listener { get; }
}

public interface IControl
{
    /// <summary>
    /// Gets or sets the value of the control.
    /// </summary>
    object? Value { get; }

    /// <summary>
    /// Gets or sets the initial value of the control.
    /// </summary>
    object? InitialValue { get; }

    /// <summary>
    /// Gets the first error message associated with the control.
    /// </summary>
    string? Error { get; }

    /// <summary>
    /// Gets a dictionary of all errors associated with the control.
    /// </summary>
    IReadOnlyDictionary<string, string> Errors { get; }

    /// <summary>
    /// Gets whether the control is in a valid state.
    /// </summary>
    bool Valid { get; }

    /// <summary>
    /// Gets whether the control's value differs from its initial value.
    /// </summary>
    bool Dirty { get; }

    /// <summary>
    /// Gets or sets whether the control is disabled.
    /// </summary>
    bool Disabled { get; }

    /// <summary>
    /// Gets or sets whether the control has been touched by user interaction.
    /// </summary>
    bool Touched { get; }
    
    /// <summary>
    /// Gets a dictionary for storing arbitrary metadata.
    /// </summary>
    IDictionary<string, object> Meta { get; }

    /// <summary>
    /// Validates the control and its children.
    /// </summary>
    /// <returns>True if the control is valid; otherwise, false.</returns>
    bool Validate();

    /// <summary>
    /// Gets a child field.
    /// </summary>
    IControl this[string propertyName] { get; }

    /// <summary>
    /// Gets a list of child controls for array elements.
    /// </summary>
    IReadOnlyList<IControl> Elements { get; }
    
    /// <summary>
    /// Subscribes to changes in the control.
    /// </summary>
    /// <param name="listener">The listener function to call when changes occur.</param>
    /// <param name="mask">The types of changes to listen for.</param>
    /// <returns>A subscription that can be used to unsubscribe.</returns>
    ISubscription Subscribe(ChangeListenerFunc listener, ControlChange mask);

    /// <summary>
    /// Unsubscribes from changes in the control.
    /// </summary>
    /// <param name="subscription">The subscription to cancel.</param>
    void Unsubscribe(ISubscription subscription);

    /// <summary>
    /// Determines whether two values are equal.
    /// </summary>
    /// <param name="v1">The first value.</param>
    /// <param name="v2">The second value.</param>
    /// <returns>True if the values are equal; otherwise, false.</returns>
    bool IsEqual(object? v1, object? v2);

}