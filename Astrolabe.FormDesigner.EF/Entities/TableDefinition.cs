using System.ComponentModel.DataAnnotations;

namespace Astrolabe.FormDesigner.EF;

public class TableDefinition
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [StringLength(255)]
    public string? Name { get; set; }

    public string? NameField { get; set; }

    public DateTime Updated { get; set; }

    [Required]
    public string Fields { get; set; }

    public IEnumerable<ExportDefinition> ExportDefinitions { get; set; }
}
