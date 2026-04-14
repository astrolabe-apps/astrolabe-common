namespace Astrolabe.Forms.EF;

public static class ItemEditContextExtensions
{
    public static ItemEditContext ModifyItem(this ItemEditContext context, Action<Item> changeItem)
    {
        changeItem(context.Item);
        return context;
    }

    public static ItemEditContext ModifyStatus(this ItemEditContext context, string status)
    {
        return context
            .AddEvent(
                AuditEventTypes.StatusChange,
                $"Change status from {context.Item.Status} to {status}"
            )
            .ModifyItem(x => x.Status = status);
    }

    public static ItemEditContext SetSubmittedAt(this ItemEditContext context)
    {
        return context.ModifyItem(x => x.SubmittedAt = DateTime.Now);
    }

    public static ItemEditContext AddEvent(
        this ItemEditContext context,
        string eventType,
        string message,
        Action<AuditEvent>? customise = null
    )
    {
        var currentEvents = context.Events ?? [];
        var newEvent = new AuditEvent
        {
            EventType = eventType,
            Message = message,
            PersonId = context.CurrentUser,
            Timestamp = DateTime.UtcNow,
            EntityKey = AuditEventHelper.EntityKeyForItemId(context.Item.Id),
        };
        customise?.Invoke(newEvent);
        return context with { Events = currentEvents.Append(newEvent) };
    }

    public static ItemEditContext AddAction(this ItemEditContext context, string action)
    {
        return context with
        {
            Actions = context.Actions.Append(new SimpleWorkflowAction(action)),
        };
    }
}
