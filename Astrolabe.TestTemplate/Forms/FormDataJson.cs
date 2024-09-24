using System.Text.Json;
using Astrolabe.JSON.Extensions;

namespace Astrolabe.TestTemplate.Forms;

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
}
