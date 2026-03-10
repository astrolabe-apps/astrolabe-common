using System.Text.Json.Nodes;

namespace Astrolabe.Schemas;

public static class JsonNodeConverter
{
    /// <summary>
    /// Recursively converts JsonNode to plain C# objects:
    /// - JsonObject → IDictionary&lt;string, object?&gt;
    /// - JsonArray → IList&lt;object?&gt;
    /// - JsonValue → primitives
    /// </summary>
    public static object? JsonNodeToObject(JsonNode? node)
    {
        return node switch
        {
            null => null,
            JsonObject obj => ConvertObject(obj),
            JsonArray arr => ConvertArray(arr),
            JsonValue val => ConvertValue(val),
            _ => null
        };
    }

    private static IDictionary<string, object?> ConvertObject(JsonObject obj)
    {
        var dict = new Dictionary<string, object?>();
        foreach (var kvp in obj)
        {
            dict[kvp.Key] = JsonNodeToObject(kvp.Value);
        }
        return dict;
    }

    private static IList<object?> ConvertArray(JsonArray arr)
    {
        var list = new List<object?>();
        foreach (var item in arr)
        {
            list.Add(JsonNodeToObject(item));
        }
        return list;
    }

    private static object? ConvertValue(JsonValue val)
    {
        if (val.TryGetValue<string>(out var strVal)) return strVal;
        if (val.TryGetValue<long>(out var longVal)) return longVal;
        if (val.TryGetValue<int>(out var intVal)) return intVal;
        if (val.TryGetValue<double>(out var doubleVal)) return doubleVal;
        if (val.TryGetValue<bool>(out var boolVal)) return boolVal;
        if (val.TryGetValue<decimal>(out var decimalVal)) return decimalVal;
        if (val.TryGetValue<DateTime>(out var dateVal)) return dateVal;
        return val.ToString();
    }
}
