using System.ComponentModel.DataAnnotations;

namespace Astrolabe.Forms.EF;

public class AuditEvent
{
    public Guid Id { get; set; }
    public DateTime Timestamp { get; set; }
    [StringLength(100)]
    public string EventType { get; set; }
    public string Message { get; set; }
    public Guid? PersonId { get; set; }
    public Person Person { get; set; }
    public string EntityKey { get; set; }
    [StringLength(100)]
    public string? OldStatus { get; set; }
    [StringLength(100)]
    public string? NewStatus { get; set; }
}
