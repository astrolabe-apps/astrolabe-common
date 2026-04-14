using Astrolabe.FormItems;
using Astrolabe.Workflow;

namespace Astrolabe.Forms.EF;

public record ItemEditContext(
    Item Item,
    List<ItemTag> Tags,
    Person Person,
    Guid CurrentUser,
    IList<string> Roles,
    IEnumerable<IItemAction> Actions,
    List<FormRule> FormRules,
    bool New,
    bool Load,
    IEnumerable<AuditEvent>? Events = null,
    object? Metadata = null,
    bool MetadataChanged = false,
    bool IndexRequired = false,
    IEnumerable<Action<ItemIndexDocument>>? Indexers = null
) : IItemWorkflowContext, IFormEditContextInfo,
    IWorkflowActionList<ItemEditContext, IItemAction>,
    IFormRuleContext
{
    // IItemWorkflowContext
    public string Status => Item.Status;

    public bool Owner => Person.Id == CurrentUser;

    // IFormRuleContext
    public Person PersonRef => Person;

    public IFormRuleContext SetMetadata(object? metadata, bool changed)
    {
        return this with { Metadata = metadata, MetadataChanged = changed };
    }

    public IFormRuleContext ModifyPerson(Action<Person> action)
    {
        action(Person);
        return this;
    }

    IFormRuleContext IFormRuleContext.AddIndexer(Action<ItemIndexDocument> editDoc, bool change)
    {
        return AddIndexer(editDoc, change);
    }

    // ItemEditContext methods
    public ItemEditContext AddIndexer(Action<ItemIndexDocument> editDoc, bool change)
    {
        var indexers = Indexers ?? [];
        return this with
        {
            Indexers = indexers.Append(editDoc),
            IndexRequired = IndexRequired || change,
        };
    }

    public (ICollection<IItemAction>, ItemEditContext) NextActions()
    {
        return (Actions.ToList(), this with { Actions = [] });
    }

    public ItemEditContext WithPerson(Action<Person> personAction)
    {
        personAction(Person);
        return this;
    }
}
