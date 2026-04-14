namespace Astrolabe.FormItems;

/// <summary>
/// Conventional string keys used to look up rules in a
/// <c>WorkflowRuleList&lt;string, IItemWorkflowContext&gt;</c>. The abstract
/// executor maps each built-in <see cref="IItemAction"/> to one of these keys
/// via <c>AbstractItemExecutor.RuleKey</c>.
/// </summary>
public static class ItemWorkflowAction
{
    public const string Create = "Create";
    public const string Edit = "Edit";
    public const string Delete = "Delete";
    public const string Submit = "Submit";
    public const string Approve = "Approve";
    public const string Reject = "Reject";
}