using System.Text.Json.Nodes;
using Astrolabe.JSON;
using Astrolabe.Controls;

namespace Astrolabe.Schemas;

public static class ControlDefinitionExtensions
{
    private static readonly string VisibilityType = DynamicPropertyType.Visible.ToString();

    public static bool IsTitleHidden(this ControlDefinition definition)
    {
        return definition switch
        {
            DataControlDefinition dcd => dcd.HideTitle ?? false,
            GroupedControlsDefinition gcd => gcd.GroupOptions?.HideTitle ?? false,
            _ => true
        };
    }

    public static LabelType GetLabelType(this ControlDefinition definition)
    {
        return definition switch
        {
            GroupedControlsDefinition gcd => LabelType.Group,
            _ => LabelType.Control
        };
    }

    public static bool IsVisible(
        this ControlDefinition definition,
        IControl data,
        JsonPathSegments context,
        ExprEvalBool? evalBool = null
    )
    {
        var dynamicVisibility = definition.Dynamic?.FirstOrDefault(x => x.Type == VisibilityType);
        if (dynamicVisibility == null)
            return true;
        evalBool ??= EntityExpressionExtensions.DefaultEvalBool;
        return evalBool(dynamicVisibility.Expr, data, context);
    }

    public static string? GetControlFieldRef(this ControlDefinition definition)
    {
        return definition switch
        {
            DataControlDefinition { Field: var field } => field,
            GroupedControlsDefinition { CompoundField: { } field } => field,
            _ => null
        };
    }

    public static (IControl?, SchemaField)? FindChildField(
        this ControlDefinition definition,
        IControl data,
        IEnumerable<SchemaField> fields
    )
    {
        var childField = definition.GetControlFieldRef();
        if (
            childField != null
            && fields.FirstOrDefault(x => x.Field == childField) is { } childSchema
        )
        {
            return (data[childField], childSchema);
        }
        return null;
    }
}
