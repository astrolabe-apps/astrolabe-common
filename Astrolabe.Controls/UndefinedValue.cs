namespace Astrolabe.Controls;

/// <summary>
/// Represents an undefined value in JavaScript-like semantics.
/// Used when a control exists but has no defined value (e.g., missing object property).
/// </summary>
public sealed class UndefinedValue
{
    /// <summary>
    /// The singleton instance of UndefinedValue.
    /// </summary>
    public static readonly UndefinedValue Instance = new();

    private UndefinedValue() { }

    public override string ToString() => "undefined";

    public override bool Equals(object? obj) => obj is UndefinedValue;

    public override int GetHashCode() => typeof(UndefinedValue).GetHashCode();
}