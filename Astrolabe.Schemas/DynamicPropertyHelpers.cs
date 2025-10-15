using System.Text.Json;

namespace Astrolabe.Schemas;

/// <summary>
/// Helper methods for dynamic property evaluation and coercion.
/// </summary>
public static class DynamicPropertyHelpers
{
    /// <summary>
    /// Coerces a value to a string for dynamic property evaluation.
    /// Matches TypeScript coerceString behavior from formStateNode.ts:305-315
    /// </summary>
    public static string? CoerceString(object? value)
    {
        return value switch
        {
            null => "",
            string s => s,
            int or long or float or double or decimal or bool => value.ToString(),
            _ => JsonSerializer.Serialize(value)
        };
    }

    /// <summary>
    /// Coerces a value to a style object (dictionary or null).
    /// Matches TypeScript coerceStyle behavior from formStateNode.ts:301-303
    /// </summary>
    public static IDictionary<string, object?>? CoerceStyle(object? value)
    {
        return value switch
        {
            IDictionary<string, object?> dict => dict,
            JsonElement jsonElement when jsonElement.ValueKind == JsonValueKind.Object =>
                JsonSerializer.Deserialize<Dictionary<string, object?>>(jsonElement.GetRawText()),
            string json when json.TrimStart().StartsWith("{") =>
                JsonSerializer.Deserialize<Dictionary<string, object?>>(json),
            _ => null
        };
    }

    /// <summary>
    /// Coerces a value to a boolean.
    /// </summary>
    public static bool CoerceBool(object? value)
    {
        return value switch
        {
            bool b => b,
            _ => value != null
        };
    }

    /// <summary>
    /// Coerces a value to an integer (or null if not a valid number).
    /// </summary>
    public static int? CoerceInt(object? value)
    {
        return value switch
        {
            int i => i,
            long l => (int)l,
            double d when d == Math.Floor(d) => (int)d,
            _ => null
        };
    }

    /// <summary>
    /// Identity coercion - returns value as-is.
    /// </summary>
    public static object? CoerceIdentity(object? value)
    {
        return value;
    }

    /// <summary>
    /// Finds the first dynamic property of a given type in a control definition.
    /// </summary>
    public static EntityExpression? FindDynamicExpression(
        ControlDefinition definition,
        DynamicPropertyType type)
    {
        var typeString = type.ToString();
        return definition.Dynamic?
            .FirstOrDefault(x => x.Type == typeString && x.Expr.Type != null)?
            .Expr;
    }
}
