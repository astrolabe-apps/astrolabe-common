using Astrolabe.Schemas.ExportCsv;

namespace Astrolabe.Forms;

public interface IExportDefinition<TTableDef>
    where TTableDef : class, ITableDefinition
{
    Guid Id { get; set; }
    string Name { get; set; }
    Guid TableDefinitionId { get; set; }
    IEnumerable<ExportColumn> ExportColumns { get; set; }

    TTableDef TableDefinition { get; set; }
}
