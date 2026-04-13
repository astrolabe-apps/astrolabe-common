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
        object? insideValue = e.ValueKind switch
        {
            JsonValueKind.False => false,
            JsonValueKind.True => true,
            JsonValueKind.String => e.GetString(),
            JsonValueKind.Number => e.TryGetInt64(out var l) ? l
            : e.TryGetDouble(out var d) ? d
            : null,
            JsonValueKind.Object => new ObjectValue(
                e.EnumerateObject()
                    .ToDictionary(
                        x => x.Name,
                        x => ToValue(p != null ? new FieldPath(x.Name, p) : null, x.Value)
                    )
            ),
            JsonValueKind.Array => new ArrayValue(
                e.EnumerateArray()
                    .Select((x, i) => ToValue(p != null ? new IndexPath(i, p) : null, x))
            ),
            _ => throw new ArgumentOutOfRangeException($"{e.ValueKind}-{e}"),
        };
        return new ValueExpr(insideValue, p);
    }

    public static ValueExpr ToValue(DataPath? p, JsonNode? node)
    {
        if (node is JsonValue jv)
        {
            return jv.GetValue<object>() switch
            {
                JsonElement e => ToValue(p, e),
                var objValue => new ValueExpr(objValue, p),
            };
        }
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
                _ => throw new ArgumentOutOfRangeException(),
            },
            p
        );
    }
}
