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
}