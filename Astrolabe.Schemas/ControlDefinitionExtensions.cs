using System.Text.Json.Nodes;
using Astrolabe.JSON;

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

    public static string? GetControlFieldRef(this ControlDefinition definition)
    {
        return definition switch
        {
            DataControlDefinition { Field: var field } => field,
            GroupedControlsDefinition { CompoundField: { } field } => field,
            _ => null
        };
    }
}
