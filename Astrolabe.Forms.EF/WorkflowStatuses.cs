namespace Astrolabe.Forms.EF;

/// <summary>
/// Workflow statuses used by Forms. Core statuses live in
/// <c>Astrolabe.FormItems.ItemStatus</c>; NotStarted is Forms-specific.
/// </summary>
public static class WorkflowStatuses
{
    public const string NotStarted = "NotStarted";
    public const string Draft = ItemStatus.Draft;
    public const string Submitted = ItemStatus.Submitted;
    public const string Approved = ItemStatus.Approved;
    public const string Rejected = ItemStatus.Rejected;
}
