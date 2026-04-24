using System.Text.Json.Serialization;
using Astrolabe.Annotation;
using Astrolabe.Schemas;

namespace Astrolabe.FormDesigner;

public record NameId(string Name, Guid Id)
{
    [JsonExtensionData]
    public IDictionary<string, object>? Extended { get; set; }
}

public record FormDefinitionEdit(
    string Name,
    [property: SchemaTag(SchemaTags.TableList)] Guid? TableId,
    IEnumerable<object> Controls,
    bool Public,
    bool Published,
    FormLayoutMode LayoutMode,
    PageNavigationStyle NavigationStyle,
    string? SystemId = null
)
{
    [JsonExtensionData]
    public IDictionary<string, object>? Extended { get; set; }
}

public record TableDefinitionEdit(
    string? Name,
    [property: SchemaTag(SchemaTags.SchemaField)] string? NameField,
    IEnumerable<object> Fields,
    IEnumerable<string> Tags
)
{
    [JsonExtensionData]
    public IDictionary<string, object>? Extended { get; set; }
}

public record ExportColumn(string Field, string ColumnName, string? Expression)
{
    [JsonExtensionData]
    public IDictionary<string, object>? Extended { get; set; }
}

public record ExportDefinitionEdit(
    Guid TableDefinitionId,
    string Name,
    IEnumerable<ExportColumn> ExportColumns
)
{
    [JsonExtensionData]
    public IDictionary<string, object>? Extended { get; set; }
}
