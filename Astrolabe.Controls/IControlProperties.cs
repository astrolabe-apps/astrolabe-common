namespace Astrolabe.Controls;

public interface IControlProperties<out T>
{
    T Value { get; }
    T InitialValue { get; }
    bool IsDirty { get; }
    bool IsDisabled { get; }
    bool IsTouched { get; }

    bool IsValid { get; }
    IReadOnlyDictionary<string, string> Errors { get; }

    /// <summary>
    /// Returns true if this control has an undefined value (e.g., missing object property).
    /// </summary>
    bool IsUndefined => Value is UndefinedValue;

    bool HasErrors => Errors.Count > 0;
}
