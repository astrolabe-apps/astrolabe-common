using System.Text.Json;
using System.Text.Json.Nodes;
using Astrolabe.JSON.Extensions;

namespace Astrolabe.Forms.EF;

public class FormDataJson
{
    public static readonly JsonSerializerOptions Options =
        new JsonSerializerOptions().AddStandardOptions();

    public static string SerializeToString(object obj)
    {
        return JsonSerializer.Serialize(obj, Options);
    }

    public static T FromString<T>(string data)
    {
        return JsonSerializer.Deserialize<T>(data, Options)!;
    }

    public static object FromString(string data, Type type)
    {
        return JsonSerializer.Deserialize(data, type, Options)!;
    }

    public static JsonNode? SerializeToNode(object? obj)
    {
        return JsonSerializer.SerializeToNode(obj, Options);
    }
}
