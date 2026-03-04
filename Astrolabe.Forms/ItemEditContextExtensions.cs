namespace Astrolabe.Forms;

public static class ItemEditContextExtensions
{
    public static ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote>
        ModifyItem<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote>(
            this ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote> context,
            Action<TItem> changeItem)
        where TItem : class, IItem<TPerson, TFormData, TItemTag, TItemNote>, new()
        where TFormData : class, IFormData<TPerson, TFormDef>, new()
        where TPerson : class, IPerson, new()
        where TFormDef : class, IFormDefinition<TTableDef>
        where TTableDef : class, ITableDefinition
        where TAuditEvent : class, IAuditEvent<TPerson>, new()
        where TItemTag : class, IItemTag, new()
        where TItemNote : class, IItemNote<TPerson>, new()
    {
        changeItem(context.Item);
        return context;
    }

    public static ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote>
        ModifyStatus<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote>(
            this ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote> context,
            string status)
        where TItem : class, IItem<TPerson, TFormData, TItemTag, TItemNote>, new()
        where TFormData : class, IFormData<TPerson, TFormDef>, new()
        where TPerson : class, IPerson, new()
        where TFormDef : class, IFormDefinition<TTableDef>
        where TTableDef : class, ITableDefinition
        where TAuditEvent : class, IAuditEvent<TPerson>, new()
        where TItemTag : class, IItemTag, new()
        where TItemNote : class, IItemNote<TPerson>, new()
    {
        return context
            .AddEvent(
                AuditEventTypes.StatusChange,
                $"Change status from {context.Item.Status} to {status}")
            .ModifyItem(x => x.Status = status);
    }

    public static ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote>
        SetSubmittedAt<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote>(
            this ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote> context)
        where TItem : class, IItem<TPerson, TFormData, TItemTag, TItemNote>, new()
        where TFormData : class, IFormData<TPerson, TFormDef>, new()
        where TPerson : class, IPerson, new()
        where TFormDef : class, IFormDefinition<TTableDef>
        where TTableDef : class, ITableDefinition
        where TAuditEvent : class, IAuditEvent<TPerson>, new()
        where TItemTag : class, IItemTag, new()
        where TItemNote : class, IItemNote<TPerson>, new()
    {
        return context.ModifyItem(x => x.SubmittedAt = DateTime.Now);
    }

    public static ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote>
        AddEvent<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote>(
            this ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote> context,
            string eventType,
            string message,
            Action<TAuditEvent>? customise = null)
        where TItem : class, IItem<TPerson, TFormData, TItemTag, TItemNote>, new()
        where TFormData : class, IFormData<TPerson, TFormDef>, new()
        where TPerson : class, IPerson, new()
        where TFormDef : class, IFormDefinition<TTableDef>
        where TTableDef : class, ITableDefinition
        where TAuditEvent : class, IAuditEvent<TPerson>, new()
        where TItemTag : class, IItemTag, new()
        where TItemNote : class, IItemNote<TPerson>, new()
    {
        var currentEvents = context.Events ?? [];
        var newEvent = new TAuditEvent
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

    public static ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote>
        AddAction<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote>(
            this ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote> context,
            string action)
        where TItem : class, IItem<TPerson, TFormData, TItemTag, TItemNote>, new()
        where TFormData : class, IFormData<TPerson, TFormDef>, new()
        where TPerson : class, IPerson, new()
        where TFormDef : class, IFormDefinition<TTableDef>
        where TTableDef : class, ITableDefinition
        where TAuditEvent : class, IAuditEvent<TPerson>, new()
        where TItemTag : class, IItemTag, new()
        where TItemNote : class, IItemNote<TPerson>, new()
    {
        return context with { Actions = context.Actions.Append(new SimpleWorkflowAction(action)) };
    }
}
