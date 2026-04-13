using Astrolabe.Schemas.ExportCsv;

namespace Astrolabe.Forms;

public interface IExportDefinition
{
    Guid Id { get; set; }
    string Name { get; set; }
    Guid TableDefinitionId { get; set; }
    IEnumerable<ExportColumn> ExportColumns { get; set; }
}

public interface IExportDefinitionEntity<TTableDef> : IExportDefinition
    where TTableDef : class, ITableDefinition
{
    TTableDef TableDefinition { get; set; }
}
