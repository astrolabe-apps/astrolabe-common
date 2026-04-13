namespace Astrolabe.FormDesigner.EF;

public interface IFormDefinitionEntity
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
