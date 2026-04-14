using Astrolabe.Workflow;

namespace Astrolabe.FormItems;

/// <summary>
/// Base executor for item actions. Consults its <see cref="WorkflowRuleList{TAction,T}"/>
/// before dispatch and routes the three built-in <see cref="IItemAction"/> records
/// to abstract handlers; anything else goes through <see cref="HandleUnknownAction"/>
/// for consumer extension.
/// </summary>
/// <typeparam name="TContext">The per-item context carried through the action loop.</typeparam>
/// <typeparam name="TLoadContext">Input to <see cref="LoadData"/>.</typeparam>
/// <typeparam name="TWorkflowContext">
/// The context type rules are written against. Often <see cref="IItemWorkflowContext"/>
/// itself, but consumers can supply a richer subtype and expose it via
/// <see cref="GetWorkflowContext"/> so their rules can read consumer-specific fields.
/// </typeparam>
public abstract class AbstractItemExecutor<TContext, TLoadContext, TWorkflowContext>
    : AbstractWorkflowExecutor<TContext, TLoadContext, IItemAction>
    where TContext : IWorkflowActionList<TContext, IItemAction>
    where TWorkflowContext : class, IItemWorkflowContext
{
    protected WorkflowRuleList<string, TWorkflowContext> Rules { get; }

    protected AbstractItemExecutor(WorkflowRuleList<string, TWorkflowContext>? rules)
    {
        Rules = rules ?? DefaultItemRules.For<TWorkflowContext>();
    }

    /// <summary>
    /// Project the per-item context down to the workflow context rules are written
    /// against. For consumers whose TContext already implements TWorkflowContext,
    /// this is typically <c>(TWorkflowContext)(object)context</c>.
    /// </summary>
    protected abstract TWorkflowContext GetWorkflowContext(TContext context);

    /// <summary>
    /// Maps an <see cref="IItemAction"/> to its rule-list key. Returning
    /// <c>null</c> means "not rule-gated" (e.g. read-side no-op actions).
    /// Override to add consumer-defined actions.
    /// </summary>
    protected virtual string? RuleKey(IItemAction action) =>
        action switch
        {
            CreateItemAction => ItemWorkflowAction.Create,
            EditMetadataAction => ItemWorkflowAction.Edit,
            DeleteItemAction => ItemWorkflowAction.Delete,
            SimpleWorkflowAction s => s.Action,
            _ => null,
        };

    public override Task<TContext> PerformAction(TContext context, IItemAction action)
    {
        var key = RuleKey(action);
        if (key != null)
        {
            var wfContext = GetWorkflowContext(context);
            var ruleGroup = Rules.ActionMap[key];
            if (!ruleGroup.Any(r => r.RuleMatch(wfContext)))
                throw new UnauthorizedAccessException(
                    $"Action '{key}' is not permitted in the current context."
                );
        }
        return Dispatch(context, action);
    }

    protected virtual Task<TContext> Dispatch(TContext context, IItemAction action) =>
        action switch
        {
            CreateItemAction c => PerformCreate(context, c),
            EditMetadataAction e => PerformEditMetadata(context, e),
            SimpleWorkflowAction s => PerformSimpleWorkflow(context, s),
            DeleteItemAction d => PerformDelete(context, d),
            _ => HandleUnknownAction(context, action),
        };

    protected abstract Task<TContext> PerformCreate(TContext context, CreateItemAction action);

    protected abstract Task<TContext> PerformEditMetadata(
        TContext context,
        EditMetadataAction action
    );

    protected abstract Task<TContext> PerformSimpleWorkflow(
        TContext context,
        SimpleWorkflowAction action
    );

    protected abstract Task<TContext> PerformDelete(TContext context, DeleteItemAction action);

    protected virtual Task<TContext> HandleUnknownAction(TContext context, IItemAction action)
    {
        throw new ArgumentOutOfRangeException(
            nameof(action),
            $"Unknown action type: {action.GetType().Name}"
        );
    }
}