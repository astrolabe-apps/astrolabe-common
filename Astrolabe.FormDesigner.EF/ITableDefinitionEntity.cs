namespace Astrolabe.FormDesigner.EF;

public interface ITableDefinitionEntity
{
    Guid Id { get; set; }
    string? Name { get; set; }
    string? NameField { get; set; }
    DateTime Updated { get; set; }
    string Fields { get; set; }
}
