namespace Astrolabe.Forms;

public interface IItemWorkflowContext
{
    string Status { get; }
    DateTime CreatedAt { get; }
    DateTime? SubmittedAt { get; }
    Guid CurrentUser { get; }
    IList<string> Roles { get; }
}
