using System.ComponentModel.DataAnnotations;

namespace Astrolabe.Forms.EF;

public class ItemFile
{
    public Guid Id { get; set; }
    [Required]
    public string Filename { get; set; }
    [Required]
    public string BlobPath { get; set; }
    public int Length { get; set; }
    public bool Global { get; set; }
    public Person Person { get; set; }
    public Guid PersonId { get; set; }
    public Item? Item { get; set; }
    public Guid? ItemId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}
