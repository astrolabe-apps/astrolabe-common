using Astrolabe.Controls;

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

    /// <summary>
    /// Gets the length of a control's value.
    /// Returns array element count for collections, string length for strings, 0 otherwise.
    /// </summary>
    public int ControlLength(SchemaField? field, IControl control)
    {
        if (control.IsArray) return control.Count;
        if (control.ValueObject is string str) return str.Length;
        return 0;
    }

    /// <summary>
    /// Generates standard validation error messages in English.
    /// Applications can override this to provide localized messages.
    /// </summary>
    public string ValidationMessageText(
        SchemaField? field,
        ValidationMessageType messageType,
        object? actualValue,
        object? expectedValue)
    {
        return messageType switch
        {
            ValidationMessageType.NotEmpty => "This field is required",
            ValidationMessageType.MinLength =>
                $"Length must be at least {expectedValue}",
            ValidationMessageType.MaxLength =>
                $"Length must be no more than {expectedValue}",
            ValidationMessageType.NotAfterDate =>
                $"Date must not be after {FormatDate(expectedValue)}",
            ValidationMessageType.NotBeforeDate =>
                $"Date must not be before {FormatDate(expectedValue)}",
            _ => "Validation error"
        };
    }

    /// <summary>
    /// Converts various date types to milliseconds since Unix epoch.
    /// Supports DateTime, DateTimeOffset, DateOnly, and parseable strings.
    /// </summary>
    public long ParseToMillis(SchemaField? field, object? value)
    {
        return value switch
        {
            DateTime dt => new DateTimeOffset(dt).ToUnixTimeMilliseconds(),
            DateTimeOffset dto => dto.ToUnixTimeMilliseconds(),
            DateOnly d => new DateTimeOffset(d.ToDateTime(TimeOnly.MinValue))
                .ToUnixTimeMilliseconds(),
            string s when DateTime.TryParse(s, out var dt) =>
                new DateTimeOffset(dt).ToUnixTimeMilliseconds(),
            _ => 0
        };
    }

    private static string FormatDate(object? value)
    {
        // Format milliseconds back to readable date
        if (value is long millis)
        {
            var dto = DateTimeOffset.FromUnixTimeMilliseconds(millis);
            return dto.ToString("yyyy-MM-dd");
        }
        return value?.ToString() ?? "";
    }
}
