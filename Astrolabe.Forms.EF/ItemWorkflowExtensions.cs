using Astrolabe.Workflow;
using static Astrolabe.Workflow.WorkflowRules;

namespace Astrolabe.Forms.EF;

public static class FormsItemWorkflowExtensions
{
    /// <summary>
    /// Forms-specific convenience: the rule matches when either
    /// <paramref name="whenStatus"/> matches <paramref name="whenRoles"/>, or any
    /// of the <paramref name="statusAndRoles"/> pairs match.
    /// </summary>
    public static IWorkflowRule<string, IItemWorkflowContext> WhenStatusAndRoles(
        this string action,
        string whenStatus,
        string[] whenRoles,
        params (string, string[])[] statusAndRoles
    )
    {
        return ActionWhen(
            action,
            (IItemWorkflowContext x) =>
            {
                var status = x.Status;
                return (status == whenStatus && x.Roles.Any(whenRoles.Contains))
                    || statusAndRoles.Any(s => s.Item1 == status && x.Roles.Any(s.Item2.Contains));
            }
        );
    }
}
