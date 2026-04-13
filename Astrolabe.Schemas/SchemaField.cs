using System.Text.Json.Serialization;
using Astrolabe.Annotation;

namespace Astrolabe.Schemas;

[JsonBaseType("type", typeof(SimpleSchemaField))]
[JsonSubType("EntityRef", typeof(EntityRefField))]
[JsonSubType("Compound", typeof(CompoundField))]
public abstract record SchemaField(
    [property: SchemaOptions(typeof(FieldType))] string Type,
    string Field
)
{
    public string? DisplayName { get; set; }

    [property: SchemaTag(SchemaTags.NoControl)]
    public bool? System { get; set; }

    public bool? Meta { get; set; }
    
    public IEnumerable<string>? Tags { get; set; }

    public IEnumerable<string>? OnlyForTypes { get; set; }

    public bool? Required { get; set; }

    public bool? NotNullable { get; set; }

    public bool? Collection { get; set; }

    public object? DefaultValue { get; set; }

    public bool? IsTypeField { get; set; }

    public bool? Searchable { get; set; }

    public string? SingularName { get; set; }

    public string? RequiredText { get; set; }

    public IEnumerable<FieldOption>? Options { get; set; }

    public IEnumerable<SchemaValidator>? Validators { get; set; }

    [JsonExtensionData]
    public IDictionary<string, object?>? Extensions { get; set; }

    public FieldType GetFieldType()
    {
        return Enum.Parse<FieldType>(Type);
    }
}

public record SimpleSchemaField(string Type, string Field) : SchemaField(Type, Field);

public record EntityRefField(string Field, string EntityRefType, string? ParentField)
    : SchemaField(FieldType.EntityRef.ToString(), Field);

public record CompoundField(
    string Field,
    [property: SchemaTag(SchemaTags.NoControl)]
    IEnumerable<SchemaField> Children,
    bool? TreeChildren,
    string? SchemaRef = null
) : SchemaField(FieldType.Compound.ToString(), Field);

[JsonString]
public enum FieldType
{
    String,
    Bool,
    Int,
    Date,
    DateTime,
    Time,
    Double,
    EntityRef,
    Compound,
    AutoId,
    Image,
    Any
}

public record FieldOption(string Name, object Value)
{
    public string? Description { get; set; }

    public bool? Disabled { get; set; }

    public string? Group { get; set; }

    [JsonExtensionData]
    public IDictionary<string, object?>? Extensions { get; set; }
}

public static class SchemaTags
{
    public const string SchemaField = "_SchemaField";
    public const string NestedSchemaField = "_NestedSchemaField";
    public const string NoControl = "_NoControl";
    public const string ControlGroup = "_ControlGroup:";
    public const string ControlRef = "_ControlRef:";
    public const string TableList = "_TableList";
    public const string ThemeList = "_ThemeList";
    public const string DefaultValue = "_DefaultValue";
    public const string HtmlEditor = "_HtmlEditor";
    public const string ScriptNullInit = "_ScriptNullInit";
}
