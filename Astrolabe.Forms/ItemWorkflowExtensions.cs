using Astrolabe.Workflow;
using static Astrolabe.Workflow.WorkflowRules;

namespace Astrolabe.Forms;

public static class ItemWorkflowExtensions
{
    public static IWorkflowRule<string, IItemWorkflowContext> And(
        this IWorkflowRule<string, IItemWorkflowContext> rule,
        Func<IItemWorkflowContext, bool> when
    )
    {
        return new WorkflowActionWhen<string, IItemWorkflowContext>(
            rule.Action,
            x => rule.RuleMatch(x) && when(x),
            rule.Properties
        );
    }

    public static IWorkflowRule<string, IItemWorkflowContext> AndHasRole(
        this IWorkflowRule<string, IItemWorkflowContext> rule,
        string role,
        params string[] roles
    )
    {
        return rule.And(x => x.Roles.Contains(role) || x.Roles.Any(roles.Contains));
    }

    public static IWorkflowRule<string, object> AsRule(this string action)
    {
        return Action<string>(action);
    }

    public static IWorkflowRule<string, IItemWorkflowContext> When(
        this string action,
        Func<IItemWorkflowContext, bool> when
    )
    {
        return ActionWhen(action, when);
    }

    public static IWorkflowRule<string, IItemWorkflowContext> WhenStatus(
        this string action,
        params string[] status
    )
    {
        return ActionWhen(
            action,
            (IItemWorkflowContext x) => status.Contains(x.Status)
        );
    }

    public static IWorkflowRule<string, IItemWorkflowContext> WhenStatusNot(
        this string action,
        params string[] status
    )
    {
        return ActionWhen(
            action,
            (IItemWorkflowContext x) => !status.Contains(x.Status)
        );
    }

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
