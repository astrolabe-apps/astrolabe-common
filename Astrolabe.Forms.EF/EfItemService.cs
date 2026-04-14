using System.Text.Json;
using Astrolabe.Common.Exceptions;
using Astrolabe.FormDesigner.EF;
using Astrolabe.EF.Search;
using Astrolabe.JSON.Extensions;
using Astrolabe.Schemas;
using Astrolabe.SearchState;
using Astrolabe.Workflow;
using Microsoft.EntityFrameworkCore;

namespace Astrolabe.Forms.EF;

public class EfItemService : IItemService, IItemActionService
{
    private readonly DbContext _dbContext;
    private readonly List<FormRule> _formRules;
    private readonly WorkflowRuleList<string, IItemWorkflowContext> _workflowRules;
    private readonly Executor _executor;

    public EfItemService(
        DbContext dbContext,
        IEnumerable<FormRule>? formRules = null,
        WorkflowRuleList<string, IItemWorkflowContext>? workflowRules = null
    )
    {
        _dbContext = dbContext;
        _formRules = formRules?.ToList() ?? new List<FormRule>();
        _workflowRules = workflowRules ?? DefaultItemRules.Default;
        _executor = new Executor(this, _workflowRules);
    }

    protected DbSet<Item> Items => _dbContext.Set<Item>();
    protected DbSet<FormData> FormDataSet => _dbContext.Set<FormData>();
    protected DbSet<Person> Persons => _dbContext.Set<Person>();
    protected DbSet<FormDefinition> FormDefinitions => _dbContext.Set<FormDefinition>();
    protected DbSet<AuditEvent> AuditEvents => _dbContext.Set<AuditEvent>();
    protected DbSet<ItemTag> ItemTags => _dbContext.Set<ItemTag>();
    protected DbSet<ItemNote> ItemNotes => _dbContext.Set<ItemNote>();

    protected Task<int> SaveChanges() => _dbContext.SaveChangesAsync();

    private static readonly SimpleSearchIndexer<ItemIndexDocument> Indexer = new(
        new JsonSerializerOptions().AddStandardOptions()
    );

    // --- Search ---

    private static async Task<List<ItemInfo>> GetSearchPage(IQueryable<Item> query)
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

    protected virtual ApplyGetter<Item>? ItemSorts(string field, ApplyGetter<Item> apply)
    {
        return field switch
        {
            "status" => apply.Apply<string>(x => x.Status),
            _ => null,
        };
    }

    protected virtual FieldFilter<Item>? ItemFilterer(string field)
    {
        return field switch
        {
            "formType" => (q, v) => q.Where(x => v.Contains(x.FormData.Type.ToString())),
            "status" => (q, v) => q.Where(x => v.Contains(x.Status)),
            _ => null,
        };
    }

    private Searcher<Item, ItemInfo>? _itemSearcher;
    private Searcher<Item, ItemInfo> ItemSearcher =>
        _itemSearcher ??= SearchHelper.CreateSearcher<Item, ItemInfo>(
            GetSearchPage,
            q => q.CountAsync(),
            SearchHelper.MakeSorter<Item>(ItemSorts),
            SearchHelper.MakeFilterer<Item>(ItemFilterer),
            maxLength: 100
        );

    private QueryFilterer<Item>? _itemFilter;
    public QueryFilterer<Item> ItemFilter =>
        _itemFilter ??= SearchHelper.MakeFilterer<Item>(ItemFilterer);

    private QuerySorter<Item>? _itemSort;
    public QuerySorter<Item> ItemSort => _itemSort ??= SearchHelper.MakeSorter<Item>(ItemSorts);

    public async Task<Dictionary<string, IEnumerable<FieldOption>>> GetFilterOptions()
    {
        var names = await FormDefinitions.Select(x => new FieldOption(x.Name, x.Id)).ToListAsync();

        return new Dictionary<string, IEnumerable<FieldOption>> { { "formType", names } };
    }

    public IQueryable<Item> ApplySearchQuery(IQueryable<Item> q, string? query)
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

    public async Task<IEnumerable<string>> GetUserActions(Guid id, Guid userId, IList<string> roles)
    {
        var existingItem = await Items.Where(x => x.Id == id).AsNoTracking().SingleOrDefaultAsync();
        NotFoundException.ThrowIfNull(existingItem);

        return _workflowRules.GetMatchingActions(
            new SimpleItemWorkflowContext(
                existingItem.Status,
                userId == existingItem.PersonId,
                roles
            )
        );
    }

    public async Task<List<Guid>> PerformActions(
        List<Guid?> itemIds,
        List<IItemAction> actions,
        ItemSecurityContext security
    )
    {
        var ids = await PerformActionsInternal(
            itemIds,
            actions,
            security.UserId,
            security.Roles,
            false
        );
        await SaveChanges();
        return ids;
    }

    /// <summary>
    /// Internal entry point allowing callers that manage their own save-changes
    /// boundary (e.g. code that needs a specific creator entity).
    /// </summary>
    public async Task<List<Guid>> PerformActionsInternal(
        List<Guid?> itemIds,
        List<IItemAction> actions,
        Guid userId,
        IList<string> roles,
        bool forLoad,
        Person? creator = null
    )
    {
        var items = await LoadItemData(itemIds, actions, userId, roles, forLoad, creator);
        var resolved = new List<Guid>();
        foreach (var itemContext in items)
        {
            var finished = await ApplyItemChanges(itemContext);
            resolved.Add(finished.Item.Id);
        }
        return resolved;
    }

    public async Task<ItemView> GetItemView(Guid id, Guid userId, IList<string> roles)
    {
        var entityKey = AuditEventHelper.EntityKeyForItemId(id);
        var data = (await LoadItemData([id], [], userId, roles, true)).FirstOrDefault();
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
        data = await _executor.PerformAction(data, new LoadMetadataAction());

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
        var data = (await LoadItemData([id], [], userId, roles, true)).FirstOrDefault();
        NotFoundException.ThrowIfNull(data);

        data = await _executor.PerformAction(data, new LoadMetadataAction());

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
        List<IItemAction> actions,
        Guid userId,
        IList<string> roles
    )
    {
        var allIds = await Items.Select(x => x.Id).Cast<Guid?>().ToListAsync();
        await PerformActionsInternal(allIds, actions, userId, roles, false);
        await SaveChanges();
    }

    public async Task AddItemNote(Guid itemId, string message, bool isInternal, Guid userId)
    {
        var note = new ItemNote
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

    public async Task<ItemView> NewItem(Guid formType, Guid userId, IList<string> roles)
    {
        // Build an item with its default metadata shape so a subsequent GET renders the empty form.
        List<IItemAction> actions =
        [
            new CreateItemAction(formType),
            new EditMetadataAction(JsonSerializer.SerializeToElement(new { }, FormDataJson.Options)),
        ];
        var ids = await PerformActions([null], actions, new ItemSecurityContext(userId, roles));
        return await GetItemView(ids[0], userId, roles);
    }

    public async Task<List<Guid>> GetPreviewItemIdsByType(Guid type)
    {
        return await Items
            .Where(x => x.FormData.Type == type)
            .Select(x => x.Id)
            .Take(10)
            .ToListAsync();
    }

    // --- Workflow engine (shared with EfItemExportService) ---

    public async Task<IEnumerable<ItemEditContext>> LoadItemData(
        IEnumerable<Guid?> itemIds,
        IEnumerable<IItemAction> actions,
        Guid userId,
        IList<string> roles,
        bool forLoad,
        Person? creator = null
    )
    {
        var idList = itemIds.ToList();
        var realIds = idList.Where(i => i.HasValue).Select(i => i!.Value).ToList();
        var needsCreatorFetch = idList.Any(i => !i.HasValue) && creator is null;

        var loaded =
            realIds.Count > 0
                ? await Items
                    .Where(x => realIds.Contains(x.Id))
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
                    .ToListAsync()
                : [];
        var loadedLookup = loaded.ToDictionary(x => x.Item.Id);

        var tags =
            realIds.Count > 0
                ? (await ItemTags.Where(x => realIds.Contains(x.ItemId)).ToListAsync()).ToLookup(x =>
                    x.ItemId
                )
                : Enumerable.Empty<ItemTag>().ToLookup(x => x.ItemId);

        if (needsCreatorFetch)
            creator = await Persons.Where(x => x.Id == userId).SingleAsync();

        var contexts = new List<ItemEditContext>();
        foreach (var id in idList)
        {
            if (id is { } g)
            {
                var x = loadedLookup[g];
                contexts.Add(
                    new ItemEditContext(
                        x.Item,
                        tags[x.Item.Id].ToList(),
                        x.Creator,
                        userId,
                        roles,
                        actions,
                        _formRules,
                        false,
                        forLoad,
                        Metadata: JsonSerializer.Deserialize<object>(
                            x.Metadata,
                            FormDataJson.Options
                        )
                    )
                );
            }
            else
            {
                // Placeholder item — CreateItemAction populates it and stages the insert.
                var item = new Item();
                contexts.Add(
                    new ItemEditContext(item, [], creator!, userId, roles, actions, _formRules, true, forLoad)
                );
            }
        }
        return contexts;
    }

    // --- Action handlers (called via the nested Executor after its rule check) ---

    /// <summary>
    /// Materialise a fresh item entity on the placeholder carried by the context
    /// and stage the insert. Subclasses can override to customise defaults.
    /// </summary>
    protected virtual Task<ItemEditContext> PerformCreate(
        ItemEditContext context,
        CreateItemAction action
    )
    {
        var item = context.Item;
        item.Status = ItemStatus.Draft;
        item.CreatedAt = DateTime.UtcNow;
        item.PersonId = context.CurrentUser;
        item.SearchText = "";
        item.FormData = new FormData
        {
            Type = action.FormType,
            Data = "{}",
            CreatorId = context.CurrentUser,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        Items.Add(item);
        return Task.FromResult(context);
    }

    protected virtual Task<ItemEditContext> PerformEditMetadata(
        ItemEditContext context,
        EditMetadataAction action
    )
    {
        return RunMetadataActions(
            context,
            initial =>
            {
                var targetType = initial?.GetType() ?? typeof(object);
                return Task.FromResult(
                    action.Metadata.Deserialize(targetType, FormDataJson.Options)!
                );
            },
            addEvent: true
        );
    }

    protected virtual Task<ItemEditContext> PerformSimpleWorkflow(
        ItemEditContext context,
        SimpleWorkflowAction action
    )
    {
        return action.Action switch
        {
            ItemWorkflowAction.Approve => Task.FromResult(context.ModifyStatus(ItemStatus.Approved)),
            ItemWorkflowAction.Submit => Task.FromResult(
                context.ModifyStatus(ItemStatus.Submitted).SetSubmittedAt()
            ),
            ItemWorkflowAction.Reject => Task.FromResult(context.ModifyStatus(ItemStatus.Draft)),
            _ => throw new ArgumentOutOfRangeException(nameof(action)),
        };
    }

    /// <summary>
    /// Hard-deletes the item and its form data. Override to soft-delete or to
    /// add cascade/audit semantics.
    /// </summary>
    protected virtual Task<ItemEditContext> PerformDelete(
        ItemEditContext context,
        DeleteItemAction action
    )
    {
        Items.Remove(context.Item);
        FormDataSet.Remove(context.Item.FormData);
        return Task.FromResult(context);
    }

    /// <summary>
    /// Routes Forms-layer actions (<see cref="LoadMetadataAction"/>,
    /// <see cref="ExportCsvAction{T}"/>) and throws for anything else.
    /// Subclasses can override for consumer-defined actions.
    /// </summary>
    protected virtual Task<ItemEditContext> HandleUnknownAction(
        ItemEditContext context,
        IItemAction action
    )
    {
        return action switch
        {
            LoadMetadataAction => RunMetadataActions(context, null, false),
            ExportCsvAction<ItemEditContext>(var exportFunc, var addEvent)
                => RunExportCsvAction(context, exportFunc, addEvent),
            _ => throw new ArgumentOutOfRangeException(
                nameof(action),
                $"Unknown action type: {action.GetType().Name}"
            ),
        };
    }

    private async Task<ItemEditContext> RunMetadataActions(
        ItemEditContext context,
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
        var finishedContext = (ItemEditContext)finished;
        if (finishedContext.MetadataChanged && addEvent)
        {
            return finishedContext.AddEvent(AuditEventTypes.FormEdited, "Form data edited");
        }
        return finishedContext;
    }

    private async Task<ItemEditContext> RunExportCsvAction(
        ItemEditContext context,
        Func<ItemEditContext, Task> exportFunc,
        bool addEvent
    )
    {
        await exportFunc(context);
        return addEvent
            ? context.AddEvent(AuditEventTypes.ExportForm, "Form data exported")
            : context;
    }

    public async Task<ItemEditContext> ApplyItemChanges(ItemEditContext context)
    {
        context = await context.PerformActions(_executor.PerformAction);
        return await AfterItemActions(context);
    }

    protected virtual async Task<ItemEditContext> AfterItemActions(ItemEditContext context)
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
                fv => new ItemTag { ItemId = itemId, Tag = fv.ToString() }
            );
        }

        if (context.Events != null)
            AuditEvents.AddRange(context.Events);
        return context with { Events = null };
    }

    /// <summary>
    /// Nested executor that owns the rule-list + dispatch logic. Each concrete
    /// handler delegates back to a virtual method on the enclosing service so
    /// subclasses of <see cref="EfItemService"/> keep their usual extension points.
    /// </summary>
    private sealed class Executor
        : AbstractItemExecutor<ItemEditContext, object?, IItemWorkflowContext>
    {
        private readonly EfItemService _svc;

        public Executor(
            EfItemService svc,
            WorkflowRuleList<string, IItemWorkflowContext>? rules
        )
            : base(rules)
        {
            _svc = svc;
        }

        public override Task<IEnumerable<ItemEditContext>> LoadData(object? loadContext) =>
            throw new NotSupportedException(
                "Use EfItemService.LoadItemData directly; the nested executor is only a dispatch helper."
            );

        protected override IItemWorkflowContext GetWorkflowContext(ItemEditContext context) =>
            context;

        protected override Task<ItemEditContext> PerformCreate(
            ItemEditContext context,
            CreateItemAction action
        ) => _svc.PerformCreate(context, action);

        protected override Task<ItemEditContext> PerformEditMetadata(
            ItemEditContext context,
            EditMetadataAction action
        ) => _svc.PerformEditMetadata(context, action);

        protected override Task<ItemEditContext> PerformSimpleWorkflow(
            ItemEditContext context,
            SimpleWorkflowAction action
        ) => _svc.PerformSimpleWorkflow(context, action);

        protected override Task<ItemEditContext> PerformDelete(
            ItemEditContext context,
            DeleteItemAction action
        ) => _svc.PerformDelete(context, action);

        protected override Task<ItemEditContext> HandleUnknownAction(
            ItemEditContext context,
            IItemAction action
        ) => _svc.HandleUnknownAction(context, action);
    }
}

public record SimpleItemWorkflowContext(string Status, bool Owner, IList<string> Roles)
    : IItemWorkflowContext;
