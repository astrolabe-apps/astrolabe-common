namespace Astrolabe.Forms;

public interface IPerson
{
    Guid Id { get; set; }
    string FirstName { get; set; }
    string LastName { get; set; }
    string? ContactNumber { get; set; }
    string? EmailAddress { get; set; }
    Guid? ExternalId { get; set; }
    string Roles { get; set; }
    string GetFullName();
}
