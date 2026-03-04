namespace Astrolabe.Forms;

public interface ITableDefinition
{
    Guid Id { get; set; }
    string? GroupId { get; set; }
    string? ShortId { get; set; }
    string? Name { get; set; }
    string? NameField { get; set; }
    DateTime Updated { get; set; }
    string Fields { get; set; }
}
