using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Astrolabe.Forms.EF;

public class Person
{
    [Key]
    public Guid Id { get; set; }
    [StringLength(100)]
    public string FirstName { get; set; }
    [StringLength(100)]
    public string LastName { get; set; }
    [StringLength(40)]
    public string? ContactNumber { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    [StringLength(255)]
    public string? EmailAddress { get; set; }
    [StringLength(100)]
    public string? PreferredName { get; set; }
    [Column("AzureId")]
    public Guid? ExternalId { get; set; }
    public List<Item> Items { get; set; }
    public List<FormData> Forms { get; set; }
    public List<AuditEvent> Events { get; set; }
    public string Roles { get; set; }

    public string GetFullName()
    {
        return FirstName + " " + LastName;
    }
}
