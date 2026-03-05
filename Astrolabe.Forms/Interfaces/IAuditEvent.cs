namespace Astrolabe.Forms;

public interface IAuditEvent<TPerson>
    where TPerson : class, IPerson
{
    Guid Id { get; set; }
    DateTime Timestamp { get; set; }
    string EventType { get; set; }
    string Message { get; set; }
    Guid? PersonId { get; set; }
    string EntityKey { get; set; }
    string? OldStatus { get; set; }
    string? NewStatus { get; set; }

    TPerson Person { get; set; }
}
