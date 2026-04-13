using Astrolabe.FormDesigner;

namespace Astrolabe.Forms;

public interface IFormDefinition
{
    Guid Id { get; set; }
    string? Name { get; set; }
    int Version { get; set; }
    Guid? TableId { get; set; }
    string? Definition { get; set; }
    bool Public { get; set; }
    bool Published { get; set; }
    FormLayoutMode LayoutMode { get; set; }
    PageNavigationStyle NavigationStyle { get; set; }
}

public interface IFormDefinitionEntity<TTableDef> : IFormDefinition
    where TTableDef : class, ITableDefinition
{
    TTableDef? Table { get; set; }
}
