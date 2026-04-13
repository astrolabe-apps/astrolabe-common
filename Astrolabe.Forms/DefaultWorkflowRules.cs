using Astrolabe.Workflow;

namespace Astrolabe.Forms;

public static class DefaultWorkflowRules
{
    public static readonly WorkflowRuleList<string, IItemWorkflowContext> Default = new(
    [
        WorkflowActions.Submit.WhenStatus(WorkflowStatuses.Draft),
        WorkflowActions.Approve.WhenStatus(WorkflowStatuses.Submitted),
        WorkflowActions.Reject.WhenStatus(WorkflowStatuses.Submitted),
    ]);
}
