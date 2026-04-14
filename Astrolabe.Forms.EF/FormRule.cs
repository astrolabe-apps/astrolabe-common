using Astrolabe.Workflow;

namespace Astrolabe.Forms.EF;

public delegate Task<IFormRuleContext> FormRuleAction(
    IFormRuleContext context,
    IEditingContext<FormRuleData<object>> form
);

/// <summary>
/// Interface that form rules see for manipulating the workflow context.
/// Consumer form rules interact with this instead of the generic ItemEditContext.
/// </summary>
public interface IFormRuleContext
{
    object? Metadata { get; }
    bool MetadataChanged { get; }
    bool New { get; }
    bool Load { get; }
    Person PersonRef { get; }
    IFormRuleContext SetMetadata(object? metadata, bool changed);
    IFormRuleContext ModifyPerson(Action<Person> action);
    IFormRuleContext AddIndexer(Action<ItemIndexDocument> editDoc, bool change);
}
