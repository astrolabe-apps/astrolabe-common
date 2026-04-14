namespace Astrolabe.FormItems;

/// <summary>
/// The minimal context a <c>WorkflowRuleList&lt;string, IItemWorkflowContext&gt;</c>
/// needs to decide whether a given action is allowed.
/// </summary>
public interface IItemWorkflowContext
{
    string Status { get; }
    IList<string> Roles { get; }
    bool Owner { get; }
}
