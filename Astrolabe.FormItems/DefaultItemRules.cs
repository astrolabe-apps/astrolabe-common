using Astrolabe.Workflow;

namespace Astrolabe.FormItems;

/// <summary>
/// Sensible out-of-the-box permissions for the built-in actions. Consumers
/// that want different semantics should construct their own
/// <see cref="WorkflowRuleList{TAction,TContext}"/> and pass it to the executor.
/// </summary>
/// <remarks>
/// Defaults:
/// <list type="bullet">
///   <item>Create — always allowed (endpoint auth gates who can reach it).</item>
///   <item>Edit — owner, while Draft.</item>
///   <item>Delete — owner, while Draft.</item>
///   <item>Submit — owner, while Draft.</item>
///   <item>Approve — while Submitted (consumer is expected to add role guards).</item>
///   <item>Reject — while Submitted (consumer is expected to add role guards).</item>
/// </list>
/// </remarks>
public static class DefaultItemRules
{
    /// <summary>
    /// Build the default rule list typed for <typeparamref name="TContext"/>.
    /// <see cref="WorkflowRuleList{TAction,T}"/> is invariant in T, so this
    /// generic method is how the executor materialises the list for its
    /// chosen workflow-context type.
    /// </summary>
    public static WorkflowRuleList<string, TContext> For<TContext>()
        where TContext : class, IItemWorkflowContext
    {
        return new WorkflowRuleList<string, TContext>(
            [
                ItemWorkflowAction.Create.AsRule(),
                ItemWorkflowAction.Edit.WhenStatus(ItemStatus.Draft).AndOwner(),
                ItemWorkflowAction.Delete.WhenStatus(ItemStatus.Draft).AndOwner(),
                ItemWorkflowAction.Submit.WhenStatus(ItemStatus.Draft).AndOwner(),
                ItemWorkflowAction.Approve.WhenStatus(ItemStatus.Submitted),
                ItemWorkflowAction.Reject.WhenStatus(ItemStatus.Submitted),
            ]
        );
    }

    public static WorkflowRuleList<string, IItemWorkflowContext> Default { get; } =
        For<IItemWorkflowContext>();
}
