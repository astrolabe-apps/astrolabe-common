namespace Astrolabe.Forms;

public interface IAuditEvent
{
    Guid Id { get; set; }
    DateTime Timestamp { get; set; }
    string EventType { get; set; }
    string Message { get; set; }
    Guid? PersonId { get; set; }
    string EntityKey { get; set; }
    string? OldStatus { get; set; }
    string? NewStatus { get; set; }
}

public interface IAuditEventEntity<TPerson> : IAuditEvent
    where TPerson : class, IPerson
{
    TPerson Person { get; set; }
}
