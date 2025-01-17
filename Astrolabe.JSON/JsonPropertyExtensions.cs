using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Astrolabe.JSON;

public static class JsonPropertyExtensions
{
    public static string GetJsonName(this MemberInfo memberInfo)
    {
        var jsonName = memberInfo.GetCustomAttribute<JsonPropertyNameAttribute>();
        return jsonName?.Name ?? JsonNamingPolicy.CamelCase.ConvertName(memberInfo.Name);
    }
}
