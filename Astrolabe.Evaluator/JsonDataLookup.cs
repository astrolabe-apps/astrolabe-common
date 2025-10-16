using System.Text.Json;
using System.Text.Json.Nodes;

namespace Astrolabe.Evaluator;

public static class JsonDataLookup
{
    public static EvalData FromObject(JsonNode? data)
    {
        return new EvalData(
            ToValue(DataPath.Empty, data),
            (e, property) =>
            {
                var childPath = e.Path != null ? new FieldPath(property, e.Path) : null;
                return e.Value switch
                {
                    ObjectValue { Object: JsonObject jObj }
                        when jObj.TryGetPropertyValue(property, out var prop) => ToValue(
                        childPath,
                        prop
                    ),
                    _ => new ValueExpr(null, childPath),
                };
            }
        );
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
                JsonObject obj => new ObjectValue(obj),
                JsonValue v => v.GetValue<object>() switch
                {
                    JsonElement e => e.ValueKind switch
                    {
                        JsonValueKind.False => false,
                        JsonValueKind.True => true,
                        JsonValueKind.String => e.GetString(),
                        JsonValueKind.Number => e.TryGetInt64(out var l) ? l
                        : e.TryGetDouble(out var d) ? d
                        : null,
                        _ => throw new ArgumentOutOfRangeException($"{e.ValueKind}-{e}"),
                    },
                    var objValue => objValue,
                },
            },
            p
        );
    }
}
