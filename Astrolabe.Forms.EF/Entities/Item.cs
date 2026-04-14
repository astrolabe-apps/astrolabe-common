using System.ComponentModel.DataAnnotations;

namespace Astrolabe.Forms.EF;

public class Item
{
    [Key]
    public Guid Id { get; set; }
    public Guid FormDataId { get; set; }
    public FormData FormData { get; set; }
    public Guid PersonId { get; set; }
    public Person Person { get; set; }
    public string SearchText { get; set; }
    [StringLength(100)]
    public string Status { get; set; } = ItemStatus.Draft;
    public DateTime CreatedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public IList<ItemNote> Notes { get; set; }
    public IList<ItemTag> Tags { get; set; }
}
