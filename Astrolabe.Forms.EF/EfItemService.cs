using System.Text.Json;
using System.Text.RegularExpressions;
using Astrolabe.Common.Exceptions;
using Astrolabe.EF.Search;
using Astrolabe.Forms;
using Astrolabe.JSON.Extensions;
using Astrolabe.Schemas;
using Astrolabe.SearchState;
using Astrolabe.Workflow;
using Microsoft.EntityFrameworkCore;

namespace Astrolabe.Forms.EF;

public class EfItemService<
    TItem,
    TFormData,
    TPerson,
    TFormDef,
    TTableDef,
    TAuditEvent,
    TItemTag,
    TItemNote
> : IItemService
    where TItem : class, IItemEntity<TPerson, TFormData, TItemTag, TItemNote>, new()
    where TFormData : class, IFormDataEntity<TPerson, TFormDef>, new()
    where TPerson : class, IPerson, new()
    where TFormDef : class, IFormDefinitionEntity<TTableDef>, new()
    where TTableDef : class, ITableDefinition, new()
    where TAuditEvent : class, IAuditEventEntity<TPerson>, new()
    where TItemTag : class, IItemTag, new()
    where TItemNote : class, IItemNoteEntity<TPerson>, new()
{
    private readonly DbContext _dbContext;
    private readonly List<FormRule> _formRules;
    private readonly WorkflowRuleList<string, IItemWorkflowContext> _workflowRules;

    public EfItemService(
        DbContext dbContext,
        IEnumerable<FormRule>? formRules = null,
        WorkflowRuleList<string, IItemWorkflowContext>? workflowRules = null
    )
    {
        _dbContext = dbContext;
        _formRules = formRules?.ToList() ?? new List<FormRule>();
        _workflowRules = workflowRules ?? DefaultWorkflowRules.Default;
    }

    protected DbSet<TItem> Items => _dbContext.Set<TItem>();
    protected DbSet<TFormData> FormDataSet => _dbContext.Set<TFormData>();
    protected DbSet<TPerson> Persons => _dbContext.Set<TPerson>();
    protected DbSet<TFormDef> FormDefinitions => _dbContext.Set<TFormDef>();
    protected DbSet<TAuditEvent> AuditEvents => _dbContext.Set<TAuditEvent>();
    protected DbSet<TItemTag> ItemTags => _dbContext.Set<TItemTag>();
    protected DbSet<TItemNote> ItemNotes => _dbContext.Set<TItemNote>();

    protected Task<int> SaveChanges() => _dbContext.SaveChangesAsync();

    private static readonly SimpleSearchIndexer<ItemIndexDocument> Indexer = new(
        new JsonSerializerOptions().AddStandardOptions()
    );

    // --- Search ---

    private static async Task<List<ItemInfo>> GetSearchPage(IQueryable<TItem> query)
    {
        return await query
            .Select(x => new ItemInfo(
                x.Id,
                x.Person.FirstName,
                x.Person.LastName,
                x.CreatedAt,
                x.Status,
                x.FormData.Type,
                x.SubmittedAt
            ))
            .AsNoTracking()
            .ToListAsync();
    }

    protected virtual ApplyGetter<TItem>? ItemSorts(string field, ApplyGetter<TItem> apply)
    {
        return field switch
        {
            "status" => apply.Apply<string>(x => x.Status),
            _ => null,
        };
    }

    protected virtual FieldFilter<TItem>? ItemFilterer(string field)
    {
        return field switch
        {
            "formType" => (q, v) => q.Where(x => v.Contains(x.FormData.Type.ToString())),
            "status" => (q, v) => q.Where(x => v.Contains(x.Status)),
            _ => null,
        };
    }

    private Searcher<TItem, ItemInfo>? _itemSearcher;
    private Searcher<TItem, ItemInfo> ItemSearcher =>
        _itemSearcher ??= SearchHelper.CreateSearcher<TItem, ItemInfo>(
            GetSearchPage,
            q => q.CountAsync(),
            SearchHelper.MakeSorter<TItem>(ItemSorts),
            SearchHelper.MakeFilterer<TItem>(ItemFilterer),
            maxLength: 100
        );

    private QueryFilterer<TItem>? _itemFilter;
    public QueryFilterer<TItem> ItemFilter =>
        _itemFilter ??= SearchHelper.MakeFilterer<TItem>(ItemFilterer);

    private QuerySorter<TItem>? _itemSort;
    public QuerySorter<TItem> ItemSort =>
        _itemSort ??= SearchHelper.MakeSorter<TItem>(ItemSorts);

    public async Task<Dictionary<string, IEnumerable<FieldOption>>> GetFilterOptions()
    {
        var names = await FormDefinitions
            .Select(x => new FieldOption(x.Name, x.Id))
            .ToListAsync();

        return new Dictionary<string, IEnumerable<FieldOption>> { { "formType", names } };
    }

    public IQueryable<TItem> ApplySearchQuery(IQueryable<TItem> q, string? query)
    {
        if (!string.IsNullOrWhiteSpace(query))
            q = q.Where(x =>
                x.Person.FirstName.Contains(query)
                || x.Person.LastName.Contains(query)
                || x.SearchText.Contains(query)
            );
        return q;
    }

    public async Task<SearchResults<ItemInfo>> SearchItems(
        SearchOptions request,
        bool includeTotal,
        Guid currentUserId
    )
    {
        var q = Items.Where(x => x.PersonId == currentUserId);
        q = ApplySearchQuery(q, request.Query);
        return await ItemSearcher(q, request, includeTotal);
    }

    public async Task<SearchResults<ItemInfo>> SearchItemsAdmin(
        SearchOptions request,
        bool includeTotal
    )
    {
        var q = Items.AsQueryable();
        q = ApplySearchQuery(q, request.Query);
        return await ItemSearcher(q, request, includeTotal);
    }

    // --- Actions / CRUD ---

    public async Task<IEnumerable<string>> GetUserActions(
        Guid id,
        Guid userId,
        IList<string> roles
    )
    {
        var existingItem = await Items
            .Where(x => x.Id == id)
            .AsNoTracking()
            .SingleOrDefaultAsync();
        NotFoundException.ThrowIfNull(existingItem);

        return _workflowRules.GetMatchingActions(
            new SimpleItemWorkflowContext(
                existingItem.Status,
                existingItem.CreatedAt,
                existingItem.SubmittedAt,
                userId,
                roles
            )
        );
    }

    Task<Guid> IItemService.PerformActions(
        IEnumerable<ItemAction> actions,
        Guid? id,
        Guid userId,
        IList<string> roles,
        Guid? formType
    ) => PerformActions(actions, id, userId, roles, formType);

    public async Task<Guid> PerformActions(
        IEnumerable<ItemAction> actions,
        Guid? id,
        Guid userId,
        IList<string> roles,
        Guid? formType = null,
        bool saveChanges = true,
        TPerson? creator = null
    )
    {
        var items = await LoadItemData(
            id is { } g ? [g] : [],
            actions,
            userId,
            roles,
            formType,
            false,
            creator
        );
        List<ItemEditContext<
            TItem,
            TFormData,
            TPerson,
            TFormDef,
            TTableDef,
            TAuditEvent,
            TItemTag,
            TItemNote
        >> finishedItems = [];
        foreach (var itemContext in items)
        {
            finishedItems.Add(await ApplyItemChanges(itemContext));
        }

        if (saveChanges)
            await SaveChanges();
        return finishedItems[0].Item.Id;
    }

    public async Task<ItemView> GetItemView(Guid id, Guid userId, IList<string> roles)
    {
        var entityKey = AuditEventHelper.EntityKeyForItemId(id);
        var data = (await LoadItemData([id], [], userId, roles, null, true)).FirstOrDefault();
        NotFoundException.ThrowIfNull(data);

        var events = await AuditEvents
            .Where(x => x.EntityKey == entityKey)
            .OrderByDescending(x => x.Timestamp)
            .Select(x => new ItemEvent(
                x.EventType,
                x.Timestamp,
                x.Message,
                x.Person.GetFullName(),
                x.OldStatus,
                x.NewStatus
            ))
            .AsNoTracking()
            .ToListAsync();
        data = await PerformItemAction(data, new LoadMetadataAction());

        var notes = data
            .Item.Notes.Select(n => new ItemNoteResult(
                Message: n.Message,
                PersonName: n.Person.GetFullName(),
                n.Timestamp
            ))
            .OrderByDescending(x => x.Timestamp);

        return new ItemView(
            await GetUserActions(id, userId, roles),
            data.Item.FormData.Type,
            data.Metadata!,
            data.Item.Status,
            data.Item.CreatedAt,
            data.Item.SubmittedAt,
            events,
            notes
        );
    }

    public async Task<ItemView> GetUserItem(Guid id, Guid userId, IList<string> roles)
    {
        var data = (await LoadItemData([id], [], userId, roles, null, true)).FirstOrDefault();
        NotFoundException.ThrowIfNull(data);

        data = await PerformItemAction(data, new LoadMetadataAction());

        var notes = data
            .Item.Notes.Where(x => !x.Internal)
            .Select(n => new ItemNoteResult(Message: n.Message, PersonName: null, n.Timestamp))
            .OrderByDescending(x => x.Timestamp);

        return new ItemView(
            await GetUserActions(id, userId, roles),
            data.Item.FormData.Type,
            data.Metadata!,
            data.Item.Status,
            data.Item.CreatedAt,
            data.Item.SubmittedAt,
            null,
            notes
        );
    }

    public async Task BulkPerformActions(
        List<ItemAction> actions,
        Guid userId,
        IList<string> roles
    )
    {
        var allIds = await Items.Select(x => x.Id).ToListAsync();
        var items = await LoadItemData(allIds, actions, userId, roles, null, false);
        foreach (var itemContext in items)
        {
            await ApplyItemChanges(itemContext);
        }
        await SaveChanges();
    }

    public async Task AddItemNote(Guid itemId, string message, bool isInternal, Guid userId)
    {
        var note = new TItemNote
        {
            Message = message,
            PersonId = userId,
            ItemId = itemId,
            Timestamp = DateTime.UtcNow,
            Internal = isInternal,
        };
        ItemNotes.Add(note);
        await SaveChanges();
    }

    public async Task<Guid> CreateItem(
        Guid formType,
        ItemEdit edit,
        Guid userId,
        IList<string> roles
    )
    {
        List<ItemAction> actions =
        [
            EditMetadataAction.Sync(o => edit.Metadata.Deserialize(o.GetType(), FormDataJson.Options)!),
        ];
        if (edit.Action is { } v)
            actions.Add(new SimpleWorkflowAction(v));
        return await PerformActions(actions, null, userId, roles, formType);
    }

    public async Task EditItem(Guid id, ItemEdit edit, Guid userId, IList<string> roles)
    {
        List<ItemAction> actions =
        [
            EditMetadataAction.Sync(o => edit.Metadata.Deserialize(o.GetType(), FormDataJson.Options)!),
        ];
        if (edit.Action is { } v)
            actions.Add(new SimpleWorkflowAction(v));
        await PerformActions(actions, id, userId, roles);
    }

    public async Task<ItemView> NewItem(Guid formType, Guid userId, IList<string> roles)
    {
        List<ItemAction> actions = [EditMetadataAction.Sync(o => o)];
        var id = await PerformActions(actions, null, userId, roles, formType);
        return await GetItemView(id, userId, roles);
    }

    public async Task<List<Guid>> GetPreviewItemIdsByType(Guid type)
    {
        return await Items.Where(x => x.FormData.Type == type).Select(x => x.Id).Take(10).ToListAsync();
    }

    public async Task DeleteItem(Guid id)
    {
        var item = await Items
            .Where(x => x.Id == id)
            .Include(x => x.FormData)
            .SingleOrDefaultAsync();
        if (item != null)
        {
            Items.Remove(item);
            FormDataSet.Remove(item.FormData);
            await SaveChanges();
        }
    }

    // --- Workflow engine (shared with EfItemExportService) ---

    public async Task<IEnumerable<ItemEditContext<
        TItem,
        TFormData,
        TPerson,
        TFormDef,
        TTableDef,
        TAuditEvent,
        TItemTag,
        TItemNote
    >>> LoadItemData(
        ICollection<Guid> itemIds,
        IEnumerable<ItemAction> actions,
        Guid userId,
        IList<string> roles,
        Guid? formType,
        bool forLoad,
        TPerson? creator = null
    )
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
                new ItemEditContext<
                    TItem,
                    TFormData,
                    TPerson,
                    TFormDef,
                    TTableDef,
                    TAuditEvent,
                    TItemTag,
                    TItemNote
                >(
                    item,
                    [],
                    creator,
                    userId,
                    roles,
                    actions,
                    _formRules,
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
        return items.Select(x => new ItemEditContext<
            TItem,
            TFormData,
            TPerson,
            TFormDef,
            TTableDef,
            TAuditEvent,
            TItemTag,
            TItemNote
        >(
            x.Item,
            tagLookup[x.Item.Id].ToList(),
            x.Creator,
            userId,
            roles,
            actions,
            _formRules,
            false,
            forLoad,
            Metadata: JsonSerializer.Deserialize<object>(x.Metadata, FormDataJson.Options)
        ));
    }

    public virtual Task<ItemEditContext<
        TItem,
        TFormData,
        TPerson,
        TFormDef,
        TTableDef,
        TAuditEvent,
        TItemTag,
        TItemNote
    >> PerformItemAction(
        ItemEditContext<
            TItem,
            TFormData,
            TPerson,
            TFormDef,
            TTableDef,
            TAuditEvent,
            TItemTag,
            TItemNote
        > context,
        ItemAction action
    )
    {
        return action switch
        {
            EditMetadataAction(var editFunc, var addEvent) => RunMetadataActions(
                context,
                editFunc,
                addEvent
            ),
            LoadMetadataAction => RunMetadataActions(context, null, false),
            SimpleWorkflowAction(var workflowAction) => PerformWorkflowAction(
                context,
                workflowAction
            ),
            ExportCsvAction<ItemEditContext<
                TItem,
                TFormData,
                TPerson,
                TFormDef,
                TTableDef,
                TAuditEvent,
                TItemTag,
                TItemNote
            >>(var exportFunc, var addEvent) => RunExportCsvAction(context, exportFunc, addEvent),
            _ => HandleUnknownAction(context, action),
        };
    }

    protected virtual Task<ItemEditContext<
        TItem,
        TFormData,
        TPerson,
        TFormDef,
        TTableDef,
        TAuditEvent,
        TItemTag,
        TItemNote
    >> HandleUnknownAction(
        ItemEditContext<
            TItem,
            TFormData,
            TPerson,
            TFormDef,
            TTableDef,
            TAuditEvent,
            TItemTag,
            TItemNote
        > context,
        ItemAction action
    )
    {
        throw new ArgumentOutOfRangeException(
            nameof(action),
            $"Unknown action type: {action.GetType().Name}"
        );
    }

    private Task<ItemEditContext<
        TItem,
        TFormData,
        TPerson,
        TFormDef,
        TTableDef,
        TAuditEvent,
        TItemTag,
        TItemNote
    >> PerformWorkflowAction(
        ItemEditContext<
            TItem,
            TFormData,
            TPerson,
            TFormDef,
            TTableDef,
            TAuditEvent,
            TItemTag,
            TItemNote
        > context,
        string workflowAction
    )
    {
        if (!_workflowRules.ActionMap[workflowAction].RuleMatch(context))
            throw new UnauthorizedException();

        return workflowAction switch
        {
            WorkflowActions.Approve => Task.FromResult(
                context.ModifyStatus(WorkflowStatuses.Approved)
            ),
            WorkflowActions.Submit => Task.FromResult(
                context.ModifyStatus(WorkflowStatuses.Submitted).SetSubmittedAt()
            ),
            WorkflowActions.Reject => Task.FromResult(context.ModifyStatus(WorkflowStatuses.Draft)),
            _ => throw new ArgumentOutOfRangeException(nameof(workflowAction)),
        };
    }

    private async Task<ItemEditContext<
        TItem,
        TFormData,
        TPerson,
        TFormDef,
        TTableDef,
        TAuditEvent,
        TItemTag,
        TItemNote
    >> RunMetadataActions(
        ItemEditContext<
            TItem,
            TFormData,
            TPerson,
            TFormDef,
            TTableDef,
            TAuditEvent,
            TItemTag,
            TItemNote
        > context,
        Func<object, Task<object>>? editFunc,
        bool addEvent
    )
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
                    (IFormRuleContext)(
                        context with
                        {
                            Metadata = result,
                            MetadataChanged = context.MetadataChanged || !result.Equals(initial),
                        }
                    ),
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
        var finishedContext = (ItemEditContext<
            TItem,
            TFormData,
            TPerson,
            TFormDef,
            TTableDef,
            TAuditEvent,
            TItemTag,
            TItemNote
        >)finished;
        if (finishedContext.MetadataChanged && addEvent)
        {
            return finishedContext.AddEvent(AuditEventTypes.FormEdited, "Form data edited");
        }
        return finishedContext;
    }

    private async Task<ItemEditContext<
        TItem,
        TFormData,
        TPerson,
        TFormDef,
        TTableDef,
        TAuditEvent,
        TItemTag,
        TItemNote
    >> RunExportCsvAction(
        ItemEditContext<
            TItem,
            TFormData,
            TPerson,
            TFormDef,
            TTableDef,
            TAuditEvent,
            TItemTag,
            TItemNote
        > context,
        Func<
            ItemEditContext<
                TItem,
                TFormData,
                TPerson,
                TFormDef,
                TTableDef,
                TAuditEvent,
                TItemTag,
                TItemNote
            >,
            Task
        > exportFunc,
        bool addEvent
    )
    {
        await exportFunc(context);
        return addEvent ? context.AddEvent(AuditEventTypes.ExportForm, "Form data exported") : context;
    }

    public async Task<ItemEditContext<
        TItem,
        TFormData,
        TPerson,
        TFormDef,
        TTableDef,
        TAuditEvent,
        TItemTag,
        TItemNote
    >> ApplyItemChanges(
        ItemEditContext<
            TItem,
            TFormData,
            TPerson,
            TFormDef,
            TTableDef,
            TAuditEvent,
            TItemTag,
            TItemNote
        > context
    )
    {
        context = await context.PerformActions(PerformItemAction);
        return await AfterItemActions(context);
    }

    protected virtual async Task<ItemEditContext<
        TItem,
        TFormData,
        TPerson,
        TFormDef,
        TTableDef,
        TAuditEvent,
        TItemTag,
        TItemNote
    >> AfterItemActions(
        ItemEditContext<
            TItem,
            TFormData,
            TPerson,
            TFormDef,
            TTableDef,
            TAuditEvent,
            TItemTag,
            TItemNote
        > context
    )
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

public record SimpleItemWorkflowContext(
    string Status,
    DateTime CreatedAt,
    DateTime? SubmittedAt,
    Guid CurrentUser,
    IList<string> Roles
) : IItemWorkflowContext;
