namespace Astrolabe.Forms.EF;

/// <summary>
/// Workflow action string keys. The core set (Submit/Approve/Reject/Create/
/// Edit/Delete) now lives in <c>Astrolabe.FormItems.ItemWorkflowAction</c>;
/// these aliases stay here for back-compat alongside the Forms-only keys.
/// </summary>
public static class WorkflowActions
{
    public const string Submit = ItemWorkflowAction.Submit;
    public const string Approve = ItemWorkflowAction.Approve;
    public const string Reject = ItemWorkflowAction.Reject;
    public const string Export = "Export";
    public const string ForceReindex = "ForceReindex";
}
