using Astrolabe.Controls;

namespace Astrolabe.Schemas;

/// <summary>
/// Interface for schema-aware operations on field values.
/// Mirrors the TypeScript SchemaInterface (subset of methods needed for expression evaluation).
/// </summary>
public interface ISchemaInterface
{
    /// <summary>
    /// Determines if a value is considered empty for a given field.
    /// </summary>
    /// <param name="field">The schema field definition</param>
    /// <param name="value">The value to check</param>
    /// <returns>True if the value is considered empty</returns>
    bool IsEmptyValue(SchemaField field, object? value);

    /// <summary>
    /// Gets the length of a control's value (array count or string length).
    /// </summary>
    /// <param name="field">The schema field definition</param>
    /// <param name="control">The control to get length from</param>
    /// <returns>The length of the control's value</returns>
    int ControlLength(SchemaField? field, IControl control);

    /// <summary>
    /// Generates a user-facing validation error message.
    /// </summary>
    /// <param name="field">The schema field definition</param>
    /// <param name="messageType">The type of validation message</param>
    /// <param name="actualValue">The actual value that failed validation</param>
    /// <param name="expectedValue">The expected/constraint value</param>
    /// <returns>The formatted error message</returns>
    string ValidationMessageText(
        SchemaField? field,
        ValidationMessageType messageType,
        object? actualValue,
        object? expectedValue);

    /// <summary>
    /// Converts a date value to milliseconds since Unix epoch.
    /// </summary>
    /// <param name="field">The schema field definition</param>
    /// <param name="value">The date value to convert</param>
    /// <returns>Milliseconds since Unix epoch (1970-01-01)</returns>
    long ParseToMillis(SchemaField? field, object? value);
}