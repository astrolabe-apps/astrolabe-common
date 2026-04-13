namespace Astrolabe.Forms;

public interface ItemAction;

public record SimpleWorkflowAction(string Action) : ItemAction;

public record LoadMetadataAction : ItemAction;

public record ExportCsvAction<TContext>(Func<TContext, Task> Export, bool AddEvent) : ItemAction;

public record EditMetadataAction(Func<object, Task<object>> Edit, bool AddEvent) : ItemAction
{
    public static EditMetadataAction Sync(Func<object, object> edit, bool addEvent = true)
    {
        return new EditMetadataAction(o => Task.FromResult(edit(o)), addEvent);
    }
}
