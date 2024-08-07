using System.Collections.Immutable;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Astrolabe.Evaluator;

public static class JsonDataLookup
{
    public static EvalEnvironment EnvironmentFor(JsonNode? data)
    {
        return EvalEnvironment.DataFrom(FromObject(data));
    }

    public static Func<DataPath, ValueExpr> FromObject(JsonNode? data)
    {
        Dictionary<DataPath, JsonNode?> cache = new();

        return path => new ValueExpr(ToValue(path, GetNode(path)), path);

        JsonNode? GetNode(DataPath dp)
        {
            if (cache.TryGetValue(dp, out var v))
                return v;
            var res = dp switch
            {
                EmptyPath => data,
                FieldPath fp => DoField(fp),
                IndexPath ip => DoIndex(ip)
            };
            cache[dp] = res;
            return res;

            JsonNode? DoField(FieldPath fp)
            {
                var parentNode = GetNode(fp.Parent);
                return parentNode == null ? parentNode : parentNode.AsObject()[fp.Field];
            }
            JsonNode? DoIndex(IndexPath ip)
            {
                var parentNode = GetNode(ip.Parent);
                return parentNode == null ? parentNode : parentNode.AsArray()[ip.Index];
            }
        }
    }

    private static object? ToValue(DataPath p, JsonNode? node)
    {
        return node switch
        {
            null => node,
            JsonArray ja
                => new ArrayValue(ja.Select((x, i) => new ValueExpr(x, new IndexPath(i, p)))),
            JsonObject obj => new ObjectValue(obj),
            JsonValue v
                => v.GetValue<object>() switch
                {
                    JsonElement e
                        => e.ValueKind switch
                        {
                            JsonValueKind.False => false,
                            JsonValueKind.True => true,
                            JsonValueKind.String => e.GetString(),
                            JsonValueKind.Number
                                => e.TryGetInt64(out var l)
                                    ? l
                                    : e.TryGetDouble(out var d)
                                        ? d
                                        : null,
                            _ => throw new ArgumentOutOfRangeException($"{e.ValueKind}-{e}")
                        },
                    var objValue => objValue
                },
        };
    }
}
