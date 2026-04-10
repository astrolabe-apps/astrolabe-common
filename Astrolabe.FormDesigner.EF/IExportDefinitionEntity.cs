namespace Astrolabe.FormDesigner.EF;

public interface IExportDefinitionEntity
{
    Guid Id { get; set; }
    string Name { get; set; }
    Guid TableDefinitionId { get; set; }
    IEnumerable<ExportColumn> ExportColumns { get; set; }
}
