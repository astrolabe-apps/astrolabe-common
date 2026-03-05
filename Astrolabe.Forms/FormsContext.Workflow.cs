using System.Text.Json;
using Astrolabe.Common.Exceptions;
using Astrolabe.EF.Search;
using Astrolabe.Workflow;
using Microsoft.EntityFrameworkCore;

namespace Astrolabe.Forms;

public partial class FormsContext<
    TItem, TFormData, TPerson, TFormDef, TTableDef,
    TAuditEvent, TItemTag, TItemNote, TItemFile, TExportDef>
{
    public async Task<IEnumerable<ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote>>>
        LoadItemData(
            ICollection<Guid> itemIds,
            IEnumerable<ItemAction> actions,
            Guid userId,
            IList<string> roles,
            Guid? formType,
            bool forLoad,
            TPerson? creator = null)
    {
        if (itemIds.Count == 0)
        {
            var item = new TItem
            {
                Status = WorkflowStatuses.Draft,
                CreatedAt = DateTime.UtcNow,
                PersonId = userId,
                SearchText = "",
            };
            var formData = new TFormData
            {
                Type = formType!.Value,
                Data = "{}",
                CreatorId = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            item.FormData = formData;
            Items.Add(item);
            creator ??= await Persons.Where(x => x.Id == userId).SingleAsync();
            return
            [
                new ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote>(
                    item,
                    [],
                    creator,
                    userId,
                    roles,
                    actions,
                    FormRules,
                    true,
                    forLoad
                ),
            ];
        }

        var itemQuery = Items.Where(x => itemIds.Contains(x.Id));
        var items = await itemQuery
            .Include(x => x.FormData)
            .ThenInclude(x => x.Definition)
            .ThenInclude(x => x!.Table)
            .Include(x => x.Notes)
            .ThenInclude(x => x.Person)
            .Select(x => new
            {
                Item = x,
                x.FormData.Creator,
                Metadata = x.FormData.Data,
            })
            .ToListAsync();
        var tags = await ItemTags.Where(x => itemIds.Contains(x.ItemId)).ToListAsync();
        var tagLookup = tags.ToLookup(x => x.ItemId);
        return items.Select(x => new ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote>(
            x.Item,
            tagLookup[x.Item.Id].ToList(),
            x.Creator,
            userId,
            roles,
            actions,
            FormRules,
            false,
            forLoad,
            Metadata: JsonSerializer.Deserialize<object>(x.Metadata, FormDataJson.Options)
        ));
    }

    public virtual Task<ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote>>
        PerformItemAction(
            ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote> context,
            ItemAction action)
    {
        return action switch
        {
            EditMetadataAction(var editFunc, var addEvent) => RunMetadataActions(context, editFunc, addEvent),
            LoadMetadataAction => RunMetadataActions(context, null, false),
            SimpleWorkflowAction(var workflowAction) => PerformWorkflowAction(context, workflowAction),
            ExportCsvAction<ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote>>(var exportFunc, var addEvent)
                => RunExportCsvAction(context, exportFunc, addEvent),
            _ => HandleUnknownAction(context, action),
        };
    }

    protected virtual Task<ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote>>
        HandleUnknownAction(
            ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote> context,
            ItemAction action)
    {
        throw new ArgumentOutOfRangeException(nameof(action),
            $"Unknown action type: {action.GetType().Name}");
    }

    private Task<ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote>>
        PerformWorkflowAction(
            ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote> context,
            string workflowAction)
    {
        if (!WorkflowRules.ActionMap[workflowAction].RuleMatch(context))
            throw new UnauthorizedException();

        return workflowAction switch
        {
            WorkflowActions.Approve => Task.FromResult(
                context.ModifyStatus(WorkflowStatuses.Approved)),
            WorkflowActions.Submit => Task.FromResult(
                context.ModifyStatus(WorkflowStatuses.Submitted).SetSubmittedAt()),
            WorkflowActions.Reject => Task.FromResult(
                context.ModifyStatus(WorkflowStatuses.Draft)),
            _ => throw new ArgumentOutOfRangeException(nameof(workflowAction)),
        };
    }

    private async Task<ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote>>
        RunMetadataActions(
            ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote> context,
            Func<object, Task<object>>? editFunc,
            bool addEvent)
    {
        var initial = context.Metadata ?? new object();
        var result = editFunc != null ? await editFunc(initial) : initial;
        var editContext = WorkflowEditContextExtensions.MakeContext(
            FormRuleData.From(initial, context),
            FormRuleData.From(result, context)
        );
        var newActions = context.FormRules.ActionsFor(editContext);
        var (finished, _) = await newActions.Aggregate(
            Task.FromResult(
                (
                    (IFormRuleContext)(context with
                    {
                        Metadata = result,
                        MetadataChanged = context.MetadataChanged || !result.Equals(initial),
                    }),
                    editContext
                )
            ),
            async (acc, f) =>
            {
                var (iec, ec) = await acc;
                var nextContext = await f(iec, ec);
                return (
                    nextContext,
                    WorkflowEditContextExtensions.MakeContext(
                        FormRuleData.From(initial, context),
                        new FormRuleData<object>(nextContext.Metadata!, context.New, context.Load)
                    )
                );
            }
        );
        var finishedContext = (ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote>)finished;
        if (finishedContext.MetadataChanged && addEvent)
        {
            return finishedContext.AddEvent(AuditEventTypes.FormEdited, "Form data edited");
        }
        return finishedContext;
    }

    private async Task<ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote>>
        RunExportCsvAction(
            ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote> context,
            Func<ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote>, Task> exportFunc,
            bool addEvent)
    {
        await exportFunc(context);
        return addEvent
            ? context.AddEvent(AuditEventTypes.ExportForm, "Form data exported")
            : context;
    }

    public async Task<ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote>>
        ApplyItemChanges(
            ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote> context)
    {
        context = await context.PerformActions(PerformItemAction);
        return await AfterItemActions(context);
    }

    protected virtual async Task<ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote>>
        AfterItemActions(
            ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote> context)
    {
        var item = context.Item;
        var itemId = item.Id;
        if (context.MetadataChanged)
        {
            context.Item.FormData.Data = FormDataJson.SerializeToString(context.Metadata!);
        }

        if (context is { IndexRequired: true, Indexers: not null })
        {
            var indexDoc = new ItemIndexDocument();
            context.Indexers!.ToList().ForEach(x => x(indexDoc));
            var existing = context.Tags;
            var (text, fields) = Indexer.Index(indexDoc);

            context.Item.SearchText = text;

            FieldValues.EditFields(
                ItemTags,
                existing,
                fields,
                i => FieldValue.FromString(i.Tag),
                fv => new TItemTag { ItemId = itemId, Tag = fv.ToString() }
            );
        }

        if (context.Events != null)
            AuditEvents.AddRange(context.Events);
        return context with { Events = null };
    }
}
