namespace Astrolabe.Forms;

public interface IItemTag
{
    Guid Id { get; set; }
    string Tag { get; set; }
    Guid ItemId { get; set; }
}
