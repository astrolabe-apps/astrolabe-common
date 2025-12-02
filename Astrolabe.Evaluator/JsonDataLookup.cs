using System.Text.Json;
using System.Text.Json.Nodes;

namespace Astrolabe.Evaluator;

public static class JsonDataLookup
{
    /// <summary>
    /// Convert a JsonNode to a ValueExpr with paths set up.
    /// </summary>
    public static ValueExpr FromObject(JsonNode? data)
    {
        return ToValue(DataPath.Empty, data);
    }

    public static ValueExpr ToValue(DataPath? p, JsonElement e)
    {
        return new ValueExpr(ValueFromElement(e), p);
    }

    private static object? ValueFromElement(JsonElement e)
    {
        return e.ValueKind switch
        {
            JsonValueKind.False => false,
            JsonValueKind.True => true,
            JsonValueKind.String => e.GetString(),
            JsonValueKind.Number => e.TryGetInt64(out var l) ? l
            : e.TryGetDouble(out var d) ? d
            : null,
            _ => throw new ArgumentOutOfRangeException($"{e.ValueKind}-{e}"),
        };
    }

    public static ValueExpr ToValue(DataPath? p, JsonNode? node)
    {
        return new ValueExpr(
            node switch
            {
                null => null,
                JsonArray ja => new ArrayValue(
                    ja.Select((x, i) => ToValue(p != null ? new IndexPath(i, p) : null, x))
                ),
                JsonObject obj => new ObjectValue(
                    obj.ToDictionary(
                        kvp => kvp.Key,
                        kvp => ToValue(p != null ? new FieldPath(kvp.Key, p) : null, kvp.Value)
                    )
                ),
                JsonValue v => v.GetValue<object>() switch
                {
                    JsonElement e => ValueFromElement(e),
                    var objValue => objValue,
                },
            },
            p
        );
    }
}
