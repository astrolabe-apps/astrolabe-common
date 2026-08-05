namespace Astrolabe.Workflow;

public interface IWorkflowRule<out TAction, in T>
{
    TAction Action { get; }

    bool RuleMatch(T context);
    
    IDictionary<string, object?>? Properties { get; }
}

public record WorkflowAction<TAction>(
    TAction Action,
    IDictionary<string, object?>? Properties = null) : IWorkflowRule<TAction, object>
{
    public bool RuleMatch(object context) => true;
}

public record WorkflowActionWhen<TAction, T>(
    TAction Action,
    Func<T, bool> When,
    IDictionary<string, object?>? Properties = null) : IWorkflowRule<TAction, T>
{
    public bool RuleMatch(T context) => When(context);
}

public static class WorkflowRules
{
    public static IWorkflowRule<TAction, object> Action<TAction>(TAction action) => new WorkflowAction<TAction>(action);
    public static IWorkflowRule<TAction, T> ActionWhen<TAction, T>(TAction action, Func<T, bool> when) => new WorkflowActionWhen<TAction, T>(action, when);
}

public record WorkflowRuleList<TAction, T>(IEnumerable<IWorkflowRule<TAction, T>> Rules) where TAction : notnull
{
    private IDictionary<TAction, IWorkflowRule<TAction, T>>? _actionMap;
    private ILookup<TAction, IWorkflowRule<TAction, T>>? _actionRules;

    /// <summary>
    /// Rules indexed by action, at most one rule per action. Throws
    /// <see cref="ArgumentException"/> if two rules share an action, and
    /// <see cref="KeyNotFoundException"/> when indexed with an unknown action.
    /// </summary>
    [Obsolete(
        "Use ActionRules, which allows multiple rules per action and yields an empty group for an unknown action."
    )]
    public IDictionary<TAction, IWorkflowRule<TAction, T>> ActionMap =>
        _actionMap ??= Rules.ToDictionary(x => x.Action);

    /// <summary>
    /// Rules indexed by action. Multiple rules with the same action are OR'd:
    /// a context is permitted for the action if any of its rules matches.
    /// A missing action key yields an empty group (deny).
    /// </summary>
    public ILookup<TAction, IWorkflowRule<TAction, T>> ActionRules =>
        _actionRules ??= Rules.ToLookup(x => x.Action);

    public IEnumerable<TAction> GetMatchingActions(T context)
    {
        return Rules.Where(x => x.RuleMatch(context)).Select(x => x.Action).Distinct();
    }
}