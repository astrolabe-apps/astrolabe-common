using Astrolabe.Workflow;
using static Astrolabe.Workflow.WorkflowRules;

namespace Astrolabe.FormItems;

/// <summary>
/// Fluent helpers for building rules over <see cref="IItemWorkflowContext"/>.
/// Thanks to the <c>in T</c> contravariance on <see cref="IWorkflowRule{TAction,T}"/>,
/// a rule returned here is usable anywhere a rule over a subtype of
/// <see cref="IItemWorkflowContext"/> is expected, so callers don't need to
/// specify type arguments.
/// </summary>
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

    public static IWorkflowRule<string, IItemWorkflowContext> AndOwner(
        this IWorkflowRule<string, IItemWorkflowContext> rule
    )
    {
        return rule.And(x => x.Owner);
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
        return ActionWhen(action, (IItemWorkflowContext x) => status.Contains(x.Status));
    }

    public static IWorkflowRule<string, IItemWorkflowContext> WhenStatusNot(
        this string action,
        params string[] status
    )
    {
        return ActionWhen(action, (IItemWorkflowContext x) => !status.Contains(x.Status));
    }
}
