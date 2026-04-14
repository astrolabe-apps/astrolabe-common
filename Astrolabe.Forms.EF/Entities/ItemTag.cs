namespace Astrolabe.Forms.EF;

public class ItemTag
{
    public Guid Id { get; set; }
    public string Tag { get; set; }
    public Guid ItemId { get; set; }
    public Item Item { get; set; }
}
