using System.ComponentModel.DataAnnotations;
using Astrolabe.FormDesigner;

namespace Astrolabe.FormDesigner.EF;

public class FormDefinition
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [StringLength(255)]
    public string? Name { get; set; }

    public int Version { get; set; }

    public TableDefinition? Table { get; set; }

    public Guid? TableId { get; set; }

    [Required]
    public string? Definition { get; set; }

    public bool Public { get; set; }

    public bool Published { get; set; }

    public FormLayoutMode LayoutMode { get; set; }

    public PageNavigationStyle NavigationStyle { get; set; }
}
