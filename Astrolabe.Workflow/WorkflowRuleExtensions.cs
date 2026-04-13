namespace Astrolabe.Workflow;

public delegate bool ActionAllowed<in TAction, in T>(T context, TAction action);

public static class WorkflowRuleExtensions
{
    public static ActionAllowed<TAction, T> RuleMatcher<T, TAction>(
        this IEnumerable<IWorkflowRule<TAction, T>> rules
    )
        where TAction : notnull
    {
        var actionMap = rules.ToDictionary(x => x.Action);
        return (context, action) => actionMap[action].RuleMatch(context);
    }

    public static IEnumerable<TAction> ActionsFor<T, TAction>(
        this IEnumerable<IWorkflowRule<TAction, T>> rules,
        T context
    )
    {
        return rules.Where(x => x.RuleMatch(context)).Select(x => x.Action);
    }

    public static IEnumerable<TAction> AllActions<T, TAction>(
        this IEnumerable<IWorkflowRule<TAction, T>> rules
    )
    {
        return rules.Select(x => x.Action);
    }

    public static IWorkflowRule<TAction, T> When<TAction, T>(
        this IWorkflowRule<TAction, T> rule,
        Func<T, bool> when
    )
    {
        return rule switch
        {
            WorkflowAction<TAction> wa => new WorkflowActionWhen<TAction, T>(
                wa.Action,
                when,
                wa.Properties
            ),
            WorkflowActionWhen<TAction, T> waw => waw with { When = x => waw.When(x) && when(x) },
            _ => throw new ArgumentOutOfRangeException(nameof(rule), rule, null),
        };
    }

    public static IWorkflowRule<TAction, T> And<TAction, T>(
        this IWorkflowRule<TAction, T> rule,
        Func<T, bool> when
    ) =>
        new WorkflowActionWhen<TAction, T>(
            rule.Action,
            x => rule.RuleMatch(x) && when(x),
            rule.Properties
        );
}
