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
                if (e.Value is ObjectValue { Properties: var props } && props.TryGetValue(property, out var propValue))
                {
                    // Preserve dependencies from parent object when accessing properties
                    var combinedDeps = new List<DataPath>();
                    if (e.Deps != null) combinedDeps.AddRange(e.Deps);
                    if (propValue.Deps != null) combinedDeps.AddRange(propValue.Deps);
                    return propValue with
                    {
                        Path = childPath,
                        Deps = combinedDeps.Count > 0 ? combinedDeps : null
                    };
                }
                return new ValueExpr(null, childPath);
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
                JsonObject obj => new ObjectValue(
                    obj.ToDictionary(
                        kvp => kvp.Key,
                        kvp => ToValue(p != null ? new FieldPath(kvp.Key, p) : null, kvp.Value)
                    )
                ),
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
