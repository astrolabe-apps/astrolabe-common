namespace Astrolabe.Forms;

public interface IItemFile
{
    Guid Id { get; set; }
    string Filename { get; set; }
    string BlobPath { get; set; }
    int Length { get; set; }
    bool Global { get; set; }
    Guid PersonId { get; set; }
    Guid? ItemId { get; set; }
    DateTime CreatedAt { get; set; }
    DateTime? DeletedAt { get; set; }
}
