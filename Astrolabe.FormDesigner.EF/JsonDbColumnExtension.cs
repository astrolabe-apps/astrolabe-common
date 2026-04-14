using System.Text.Json;
using Astrolabe.JSON.Extensions;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Astrolabe.FormDesigner.EF;

public static class JsonDbColumnExtension
{
    private static readonly JsonSerializerOptions DbJsonOptions = new JsonSerializerOptions()
    {
        PropertyNameCaseInsensitive = true,
    }.AddStandardOptions();

    public static PropertyBuilder<T> WithJson<T>(
        this PropertyBuilder<T> propertyBuilder,
        T defaultValue,
        ValueComparer<T> valueComparer
    )
    {
        return propertyBuilder.HasConversion(
            v => JsonSerializer.Serialize(v, DbJsonOptions),
            s =>
                string.IsNullOrEmpty(s)
                    ? defaultValue
                    : JsonSerializer.Deserialize<T>(s, DbJsonOptions),
            valueComparer
        );
    }
}
