using System.Text.Json;
using Astrolabe.JSON.Extensions;

namespace Astrolabe.Forms;

public static class DbJson
{
    private static readonly JsonSerializerOptions DbJsonOptions = new JsonSerializerOptions()
    {
        PropertyNameCaseInsensitive = true,
    }.AddStandardOptions();

    public static T FromJson<T>(string? json)
    {
        return string.IsNullOrEmpty(json)
            ? default!
            : JsonSerializer.Deserialize<T>(json, DbJsonOptions)!;
    }

    public static string ToJson(object json)
    {
        return JsonSerializer.Serialize(json, DbJsonOptions);
    }
}
