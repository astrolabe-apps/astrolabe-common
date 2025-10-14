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
