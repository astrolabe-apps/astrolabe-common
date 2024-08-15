namespace Astrolabe.Workflow;

public abstract class AbstractWorkflowExecutor<TContext, TLoadContext, TAction>
    where TContext : IWorkflowActionList<TContext, TAction>
{
    public abstract Task<IEnumerable<TContext>> LoadData(TLoadContext loadContext);

    public async Task<TContext> ApplyChanges(TContext context)
    {
        context = await context.PerformActions(PerformAction);
        return await AfterActions(context);
    }

    protected virtual Task<TContext> AfterActions(TContext context)
    {
        return Task.FromResult(context);
    }

    public abstract Task<TContext> PerformAction(TContext context, TAction action);
}
