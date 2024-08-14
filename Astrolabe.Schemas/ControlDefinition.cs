using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Astrolabe.Annotation;

namespace Astrolabe.Schemas;

[JsonString]
public enum ControlDefinitionType
{
    Data,
    Group,
    Display,
    Action
}

[JsonBaseType("type", typeof(DataControlDefinition))]
[JsonSubType("Data", typeof(DataControlDefinition))]
[JsonSubType("Group", typeof(GroupedControlsDefinition))]
[JsonSubType("Display", typeof(DisplayControlDefinition))]
[JsonSubType("Action", typeof(ActionControlDefinition))]
public abstract record ControlDefinition(
    [property: SchemaOptions(typeof(ControlDefinitionType))] string Type
)
{
    public string? Title { get; set; }

    public IEnumerable<DynamicProperty>? Dynamic { get; set; }

    public IEnumerable<ControlAdornment>? Adornments { get; set; }

    public string? StyleClass { get; set; }

    public string? LayoutClass { get; set; }

    public string? LabelClass { get; set; }

    [SchemaTag(SchemaTags.NoControl)]
    public IEnumerable<ControlDefinition>? Children { get; set; }

    [JsonExtensionData]
    public IDictionary<string, object?>? Extensions { get; set; }
}

public record DataControlDefinition([property: SchemaTag(SchemaTags.SchemaField)] string Field)
    : ControlDefinition(ControlDefinitionType.Data.ToString())
{
    public bool? HideTitle { get; set; }

    [DefaultValue(false)]
    public bool? Required { get; set; }

    public RenderOptions? RenderOptions { get; set; }

    [SchemaTag(SchemaTags.ValuesOf + "field")]
    public object? DefaultValue { get; set; }

    [DefaultValue(false)]
    public bool? Readonly { get; set; }

    [DefaultValue(false)]
    public bool? Disabled { get; set; }

    public bool? DontClearHidden { get; set; }

    public IEnumerable<SchemaValidator>? Validators { get; set; }
}

public record GroupedControlsDefinition()
    : ControlDefinition(ControlDefinitionType.Group.ToString())
{
    public static readonly ControlDefinition Default = new GroupedControlsDefinition();

    [SchemaTag(SchemaTags.NestedSchemaField)]
    public string? CompoundField { get; set; }

    public GroupRenderOptions? GroupOptions { get; set; }
}

public record DisplayControlDefinition(DisplayData DisplayData)
    : ControlDefinition(ControlDefinitionType.Display.ToString());

public record ActionControlDefinition(string ActionId, string? ActionData)
    : ControlDefinition(ControlDefinitionType.Action.ToString());

[JsonString]
public enum DataRenderType
{
    [Display(Name = "Default")]
    Standard,

    [Display(Name = "Textfield")]
    Textfield,

    [Display(Name = "Radio buttons")]
    Radio,

    [Display(Name = "HTML Editor")]
    HtmlEditor,

    [Display(Name = "Icon list")]
    IconList,

    [Display(Name = "Check list")]
    CheckList,

    [Display(Name = "User Selection")]
    UserSelection,

    [Display(Name = "Synchronised Fields")]
    Synchronised,

    [Display(Name = "Icon Selection")]
    IconSelector,

    [Display(Name = "Date/Time")]
    DateTime,

    [Display(Name = "Checkbox")]
    Checkbox,

    [Display(Name = "Dropdown")]
    Dropdown,

    [Display(Name = "Display Only")]
    DisplayOnly,

    [Display(Name = "Group")]
    Group,

    [Display(Name = "Null Toggler")]
    NullToggle,

    Jsonata,
}

[JsonBaseType("type", typeof(SimpleRenderOptions))]
[JsonSubType("HtmlEditor", typeof(HtmlEditorRenderOptions))]
[JsonSubType("IconList", typeof(IconListRenderOptions))]
[JsonSubType("Synchronised", typeof(SynchronisedRenderOptions))]
[JsonSubType("UserSelection", typeof(UserSelectionRenderOptions))]
[JsonSubType("DateTime", typeof(DateTimeRenderOptions))]
[JsonSubType("DisplayOnly", typeof(DisplayOnlyRenderOptions))]
[JsonSubType("Group", typeof(DataGroupRenderOptions))]
[JsonSubType("Textfield", typeof(TextfieldRenderOptions))]
[JsonSubType("Jsonata", typeof(JsonataRenderOptions))]
public abstract record RenderOptions(
    [property: DefaultValue("Standard")]
    [property: SchemaOptions(typeof(DataRenderType))]
        string Type
)
{
    [JsonExtensionData]
    public IDictionary<string, object?>? Extensions { get; set; }
}

public record SimpleRenderOptions(string Type) : RenderOptions(Type);

public record JsonataRenderOptions(string Expression)
    : RenderOptions(DataRenderType.Jsonata.ToString());

public record TextfieldRenderOptions(string? Placeholder, bool? Multiline)
    : RenderOptions(DataRenderType.Textfield.ToString());

public record DataGroupRenderOptions(GroupRenderOptions GroupOptions)
    : RenderOptions(DataRenderType.Group.ToString());

public record DisplayOnlyRenderOptions(string? EmptyText, string? SampleText)
    : RenderOptions(DataRenderType.DisplayOnly.ToString());

public record UserSelectionRenderOptions(bool NoGroups, bool NoUsers)
    : RenderOptions(DataRenderType.UserSelection.ToString());

public record DateTimeRenderOptions(
    string? Format,
    [property: DefaultValue(false)] bool? ForceMidnight
) : RenderOptions(DataRenderType.DateTime.ToString());

public record SynchronisedRenderOptions(
    [property: SchemaTag(SchemaTags.SchemaField)] string FieldToSync,
    SyncTextType SyncType
) : RenderOptions(DataRenderType.Synchronised.ToString());

[JsonString]
public enum SyncTextType
{
    Camel,
    Snake,
    Pascal,
}

public record IconListRenderOptions(IEnumerable<IconMapping> IconMappings)
    : RenderOptions(DataRenderType.IconList.ToString());

public record HtmlEditorRenderOptions(bool AllowImages)
    : RenderOptions(DataRenderType.HtmlEditor.ToString());

public record IconMapping(string Value, string? MaterialIcon);

[JsonString]
public enum DisplayDataType
{
    Text,
    Html,
    Icon,
    Custom
}

[JsonBaseType("type", typeof(SimpleDisplayData))]
[JsonSubType("Text", typeof(TextDisplay))]
[JsonSubType("Html", typeof(HtmlDisplay))]
[JsonSubType("Icon", typeof(IconDisplay))]
[JsonSubType("Custom", typeof(CustomDisplay))]
public abstract record DisplayData([property: SchemaOptions(typeof(DisplayDataType))] string Type)
{
    [JsonExtensionData]
    public IDictionary<string, object?>? Extensions { get; set; }
}

public record SimpleDisplayData(string Type) : DisplayData(Type);

public record IconDisplay(string IconClass) : DisplayData(DisplayDataType.Icon.ToString());

public record TextDisplay(string Text) : DisplayData(DisplayDataType.Text.ToString());

public record CustomDisplay(string CustomId) : DisplayData(DisplayDataType.Custom.ToString());

public record HtmlDisplay([property: SchemaTag(SchemaTags.HtmlEditor)] string Html)
    : DisplayData(DisplayDataType.Html.ToString());

[JsonString]
public enum DynamicPropertyType
{
    Visible,
    DefaultValue,
    Readonly,
    Disabled,
    Display,
    Style,
    LayoutStyle,
    AllowedOptions,
    Label,
    ActionData
}

public record DynamicProperty(
    [property: SchemaOptions(typeof(DynamicPropertyType))] string Type,
    EntityExpression Expr
);

[JsonString]
public enum GroupRenderType
{
    Standard,
    Grid,
    Flex,
    GroupElement,
}

[JsonBaseType("type", typeof(SimpleGroupRenderOptions))]
[JsonSubType("Standard", typeof(SimpleGroupRenderOptions))]
[JsonSubType("GroupElement", typeof(GroupElementRenderer))]
[JsonSubType("Grid", typeof(GridRenderer))]
[JsonSubType("Flex", typeof(FlexRenderer))]
public abstract record GroupRenderOptions(
    [property: SchemaOptions(typeof(GroupRenderType))]
    [property: DefaultValue("Standard")]
        string Type
)
{
    public bool? HideTitle { get; set; }
}

public record SimpleGroupRenderOptions(string Type) : GroupRenderOptions(Type);

public record FlexRenderer(string? Direction, string? Gap)
    : GroupRenderOptions(GroupRenderType.Flex.ToString());

public record GridRenderer(int? Columns) : GroupRenderOptions(GroupRenderType.Grid.ToString());

public record GroupElementRenderer([property: SchemaTag(SchemaTags.DefaultValue)] object Value)
    : GroupRenderOptions(GroupRenderType.GroupElement.ToString());

[JsonString]
public enum AdornmentPlacement
{
    [Display(Name = "Start of control")]
    ControlStart,

    [Display(Name = "End of control")]
    ControlEnd,

    [Display(Name = "Start of label")]
    LabelStart,

    [Display(Name = "End of label")]
    LabelEnd,
}

[JsonString]
public enum ControlAdornmentType
{
    Tooltip,
    Accordion,

    [Display(Name = "Help Text")]
    HelpText,
    Icon
}

[JsonBaseType("type", typeof(HelpTextAdornment))]
[JsonSubType("Tooltip", typeof(TooltipAdornment))]
[JsonSubType("Accordion", typeof(AccordionAdornment))]
[JsonSubType("HelpText", typeof(HelpTextAdornment))]
[JsonSubType("Icon", typeof(IconAdornment))]
public abstract record ControlAdornment(
    [property: SchemaOptions(typeof(ControlAdornmentType))] string Type
)
{
    [JsonExtensionData]
    public IDictionary<string, object?>? Extensions { get; set; }
}

public record IconAdornment(string IconClass, AdornmentPlacement? Placement)
    : ControlAdornment(ControlAdornmentType.Icon.ToString());

public record TooltipAdornment(string Tooltip)
    : ControlAdornment(ControlAdornmentType.Tooltip.ToString());

public record AccordionAdornment(string Title, bool DefaultExpanded)
    : ControlAdornment(ControlAdornmentType.Accordion.ToString());

public record HelpTextAdornment(string HelpText, AdornmentPlacement? Placement)
    : ControlAdornment(ControlAdornmentType.HelpText.ToString());
