using System.ComponentModel.DataAnnotations;

namespace Astrolabe.FormDesigner.EF;

public class ExportDefinition
{
    [Key]
    public Guid Id { get; set; }

    [StringLength(255)]
    public string Name { get; set; }

    public Guid TableDefinitionId { get; set; }

    public TableDefinition TableDefinition { get; set; }

    public IEnumerable<ExportColumn> ExportColumns { get; set; }
}
