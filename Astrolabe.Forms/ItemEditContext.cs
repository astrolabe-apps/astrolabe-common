using Astrolabe.Workflow;

namespace Astrolabe.Forms;

public record ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef,
    TAuditEvent, TItemTag, TItemNote>(
    TItem Item,
    List<TItemTag> Tags,
    TPerson Person,
    Guid CurrentUser,
    IList<string> Roles,
    IEnumerable<ItemAction> Actions,
    List<FormRule> FormRules,
    bool New,
    bool Load,
    IEnumerable<TAuditEvent>? Events = null,
    object? Metadata = null,
    bool MetadataChanged = false,
    bool IndexRequired = false,
    IEnumerable<Action<ItemIndexDocument>>? Indexers = null
) : IItemWorkflowContext, IFormEditContextInfo,
    IWorkflowActionList<ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote>, ItemAction>,
    IFormRuleContext
    where TItem : class, IItem<TPerson, TFormData, TItemTag, TItemNote>, new()
    where TFormData : class, IFormData<TPerson, TFormDef>, new()
    where TPerson : class, IPerson, new()
    where TFormDef : class, IFormDefinition<TTableDef>
    where TTableDef : class, ITableDefinition
    where TAuditEvent : class, IAuditEvent<TPerson>, new()
    where TItemTag : class, IItemTag, new()
    where TItemNote : class, IItemNote<TPerson>, new()
{
    // IItemWorkflowContext
    public string Status => Item.Status;
    public DateTime CreatedAt => Item.CreatedAt;
    public DateTime? SubmittedAt => Item.SubmittedAt;

    // IFormRuleContext
    public IPerson PersonRef => Person;

    public IFormRuleContext SetMetadata(object? metadata, bool changed)
    {
        return this with { Metadata = metadata, MetadataChanged = changed };
    }

    public IFormRuleContext ModifyPerson(Action<IPerson> action)
    {
        action(Person);
        return this;
    }

    IFormRuleContext IFormRuleContext.AddIndexer(Action<ItemIndexDocument> editDoc, bool change)
    {
        return AddIndexer(editDoc, change);
    }

    // ItemEditContext methods
    public ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote>
        AddIndexer(Action<ItemIndexDocument> editDoc, bool change)
    {
        var indexers = Indexers ?? [];
        return this with
        {
            Indexers = indexers.Append(editDoc),
            IndexRequired = IndexRequired || change,
        };
    }

    public (ICollection<ItemAction>, ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote>) NextActions()
    {
        return (Actions.ToList(), this with { Actions = [] });
    }

    public ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote>
        WithPerson(Action<TPerson> personAction)
    {
        personAction(Person);
        return this;
    }
}
