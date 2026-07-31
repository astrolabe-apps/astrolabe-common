using System.Text.Json;
using System.Text.Json.Serialization;

namespace Astrolabe.JSON.Extensions;

public static class JsonSerializerOptionsExtensions
{
    /// <summary>
    /// Applies the standard Astrolabe serializer settings. Pass
    /// <paramref name="allowIntegerEnumValues"/> = false to make enums marked with
    /// [JsonString] reject numeric values on deserialization.
    /// </summary>
    public static JsonSerializerOptions AddStandardOptions(
        this JsonSerializerOptions options,
        bool allowIntegerEnumValues = true
    )
    {
        options.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        options.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.Converters.Add(new JsonBaseTypeConverter());
        options.Converters.Add(new StringAttributeConverter(allowIntegerEnumValues));
        return options;
    }
}