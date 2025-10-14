namespace Astrolabe.Schemas;

/// <summary>
/// Default implementation of ISchemaInterface with standard empty value checking.
/// </summary>
public class DefaultSchemaInterface : ISchemaInterface
{
    /// <summary>
    /// Singleton instance of the default schema interface.
    /// </summary>
    public static readonly DefaultSchemaInterface Instance = new();

    /// <summary>
    /// Determines if a value is considered empty based on standard rules.
    /// </summary>
    /// <param name="field">The schema field</param>
    /// <param name="value">The value to check</param>
    /// <returns>True if the value is null, empty string, whitespace, or empty collection</returns>
    public bool IsEmptyValue(SchemaField field, object? value)
    {
        return value == null ||
               (value is string s && string.IsNullOrWhiteSpace(s)) ||
               (value is System.Collections.ICollection c && c.Count == 0);
    }
}
