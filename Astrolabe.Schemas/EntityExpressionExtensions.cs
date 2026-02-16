using System.Text.Json;
using System.Text.Json.Nodes;
using Astrolabe.JSON;
using Astrolabe.Controls;
using Jsonata.Net.Native;
using Jsonata.Net.Native.Json;
using Jsonata.Net.Native.SystemTextJson;

namespace Astrolabe.Schemas;

public delegate bool ExprEvalBool(EntityExpression expression, IControl data, JsonPathSegments context);

public static class JsonPathControlExtensions
{
    public static IControl? Traverse(this JsonPathSegments segments, IControl? control)
    {
        var allSegments = segments.Segments.ToArray().Reverse();
        foreach (var segment in allSegments)
        {
            if (control == null)
                return null;
            control = segment switch
            {
                int i => control[i],
                string s => control[s],
                _ => throw new ArgumentOutOfRangeException()
            };
        }
        return control;
    }
}

public static class EntityExpressionExtensions
{
    
    public static bool DefaultEvalBool(this EntityExpression expression, IControl data, JsonPathSegments context)
    {
        return expression switch
        {
            NotExpression expr => !DefaultEvalBool(expr.InnerExpression, data, context),
            DataMatchExpression expr => ControlEquals(context.Field(expr.Field).Traverse(data), expr.Value),
            JsonataExpression expr => RunJsonata(expr.Expression),
            _ => throw new ArgumentOutOfRangeException(nameof(expression), expression, null)
        };

        bool RunJsonata(string expr)
        {
            // Convert IControl to JsonNode for Jsonata evaluation
            var jsonNode = data.ValueObject as JsonNode ?? JsonSerializer.SerializeToNode(data.ValueObject);
            var result = new JsonataQuery(expr).Eval(
                JsonataExtensions.FromSystemTextJson(JsonDocument.Parse(jsonNode?.ToJsonString() ?? "{}")));
            if (result.Type == JTokenType.Boolean)
            {
                return (bool)result;
            }
            return false;
        }
    }

    private static bool ControlEquals(IControl? control, object? value)
    {
        if (control == null)
            return value == null;

        var controlValue = control.ValueObject;

        return (controlValue, value) switch
        {
            (JsonArray a, JsonElement e) => a.Contains(JsonValue.Create(e)),
            (JsonNode n, JsonElement e) => JsonNode.DeepEquals(n.AsValue(), JsonValue.Create(e)),
            ({} cv, JsonElement e) => cv.Equals(JsonSerializer.Deserialize(e, cv.GetType())),
            ({} cv, {} v) => cv.Equals(v),
            _ => false
        };
    }
}