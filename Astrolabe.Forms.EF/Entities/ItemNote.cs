namespace Astrolabe.Forms.EF;

public class ItemNote
{
    public Guid Id { get; set; }
    public string Message { get; set; }
    public Guid? PersonId { get; set; }
    public Person Person { get; set; }
    public Item Item { get; set; }
    public Guid ItemId { get; set; }
    public DateTime Timestamp { get; set; }
    public bool Internal { get; set; }
}
