using System.Text.Json;
using System.Text.Json.Serialization;
using Astrolabe.Annotation;

namespace Astrolabe.JSON;

/// <summary>
/// Serializes enums marked with <see cref="JsonStringAttribute"/> as their member names.
/// Pass <c>allowIntegerValues: false</c> to reject numeric JSON values (and numeric
/// strings) on read, so an undefined member (e.g. 999) fails deserialization instead
/// of materialising as an undefined enum value.
/// </summary>
public class StringAttributeConverter : JsonConverterFactory
{
    private readonly JsonStringEnumConverter _inner;

    public StringAttributeConverter(bool allowIntegerValues = true)
    {
        _inner = new JsonStringEnumConverter(allowIntegerValues: allowIntegerValues);
    }

    public override bool CanConvert(Type typeToConvert)
    {
        return typeToConvert.IsDefined(typeof(JsonStringAttribute), false);
    }

    public override JsonConverter? CreateConverter(Type typeToConvert, JsonSerializerOptions options)
    {
        return _inner.CreateConverter(typeToConvert, options);
    }
}