using System.Text.Json;
using System.Text.RegularExpressions;
using Astrolabe.Common.Exceptions;
using Astrolabe.EF.Search;
using Astrolabe.Schemas;
using Astrolabe.JSON.Extensions;
using Astrolabe.SearchState;
using Astrolabe.Workflow;
using Microsoft.EntityFrameworkCore;

namespace Astrolabe.Forms;

public partial class FormsContext<
    TItem, TFormData, TPerson, TFormDef, TTableDef,
    TAuditEvent, TItemTag, TItemNote, TItemFile, TExportDef>
{
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

    private Searcher<TItem, ItemInfo> ItemSearcher => _itemSearcher ??= SearchHelper.CreateSearcher<TItem, ItemInfo>(
        GetSearchPage,
        q => q.CountAsync(),
        SearchHelper.MakeSorter<TItem>(ItemSorts),
        SearchHelper.MakeFilterer<TItem>(ItemFilterer),
        maxLength: 100
    );

    private QueryFilterer<TItem>? _itemFilter;
    private QueryFilterer<TItem> ItemFilter => _itemFilter ??= SearchHelper.MakeFilterer<TItem>(ItemFilterer);

    private QuerySorter<TItem>? _itemSort;
    private QuerySorter<TItem> ItemSort => _itemSort ??= SearchHelper.MakeSorter<TItem>(ItemSorts);

    public async Task<Dictionary<string, IEnumerable<FieldOption>>> GetFilterOptions()
    {
        var names = await FormDefinitions
            .Select(x => new FieldOption(x.Name, x.Id))
            .ToListAsync();

        return new Dictionary<string, IEnumerable<FieldOption>> { { "formType", names } };
    }

    public static string AddSpacesToPascalCase(string pascalCaseString)
    {
        if (string.IsNullOrEmpty(pascalCaseString))
            return pascalCaseString;
        return Regex.Replace(pascalCaseString, "([a-z])([A-Z])", "$1 $2");
    }

    private IQueryable<TItem> ApplySearchQuery(IQueryable<TItem> q, string? query)
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
        Guid currentUserId)
    {
        var q = Items.Where(x => x.PersonId == currentUserId);
        q = ApplySearchQuery(q, request.Query);
        return await ItemSearcher(q, request, includeTotal);
    }

    public async Task<SearchResults<ItemInfo>> SearchItemsAdmin(
        SearchOptions request,
        bool includeTotal)
    {
        var q = Items.AsQueryable();
        q = ApplySearchQuery(q, request.Query);
        return await ItemSearcher(q, request, includeTotal);
    }

    public async Task<List<Guid>> GetExportableItemIds(SearchOptions searchOptions)
    {
        var q = Items.AsQueryable();
        q = ItemFilter(searchOptions.Filters, q);
        q = ApplySearchQuery(q, searchOptions.Query);
        q = ItemSort(searchOptions.Sort, q);
        return await q.Where(x => x.Status == WorkflowStatuses.Submitted)
            .Select(x => x.Id)
            .ToListAsync();
    }

    public async Task<IEnumerable<string>> GetUserActions(Guid id, Guid userId, IList<string> roles)
    {
        var existingItem = await Items
            .Where(x => x.Id == id)
            .AsNoTracking()
            .SingleOrDefaultAsync();
        NotFoundException.ThrowIfNull(existingItem);

        return WorkflowRules.GetMatchingActions(
            new SimpleItemWorkflowContext(existingItem.Status, existingItem.CreatedAt,
                existingItem.SubmittedAt, userId, roles)
        );
    }

    Task<Guid> IFormsContext.PerformActions(
        IEnumerable<ItemAction> actions,
        Guid? id,
        Guid userId,
        IList<string> roles,
        Guid? formType) => PerformActions(actions, id, userId, roles, formType);

    public async Task<Guid> PerformActions(
        IEnumerable<ItemAction> actions,
        Guid? id,
        Guid userId,
        IList<string> roles,
        Guid? formType = null,
        bool saveChanges = true,
        TPerson? creator = null)
    {
        var items = await LoadItemData(id is { } g ? [g] : [], actions, userId, roles, formType, false, creator);
        List<ItemEditContext<TItem, TFormData, TPerson, TFormDef, TTableDef, TAuditEvent, TItemTag, TItemNote>> finishedItems = [];
        foreach (var itemContext in items)
        {
            finishedItems.Add(await ApplyItemChanges(itemContext));
        }

        if (saveChanges)
            await SaveChanges();
        return finishedItems[0].Item.Id;
    }

    public async Task<FullItem> GetFullItem(Guid id, Guid userId, IList<string> roles)
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

        return new FullItem(
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

    public async Task<FullItem> GetUserItem(Guid id, Guid userId, IList<string> roles)
    {
        var data = (await LoadItemData([id], [], userId, roles, null, true)).FirstOrDefault();
        NotFoundException.ThrowIfNull(data);

        data = await PerformItemAction(data, new LoadMetadataAction());

        var notes = data
            .Item.Notes.Where(x => !x.Internal)
            .Select(n => new ItemNoteResult(Message: n.Message, PersonName: null, n.Timestamp))
            .OrderByDescending(x => x.Timestamp);

        return new FullItem(
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

    public async Task BulkPerformActions(List<ItemAction> actions, Guid userId, IList<string> roles)
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

    public async Task<Guid> CreateItem(Guid formType, FullEdit edit, Guid userId, IList<string> roles)
    {
        List<ItemAction> actions = [EditMetadataAction.Sync(o =>
            edit.Metadata.Deserialize(o.GetType(), FormDataJson.Options)!)];
        if (edit.Action is { } v) actions.Add(new SimpleWorkflowAction(v));
        return await PerformActions(actions, null, userId, roles, formType);
    }

    public async Task EditItem(Guid id, FullEdit edit, Guid userId, IList<string> roles)
    {
        List<ItemAction> actions = [EditMetadataAction.Sync(o =>
            edit.Metadata.Deserialize(o.GetType(), FormDataJson.Options)!)];
        if (edit.Action is { } v) actions.Add(new SimpleWorkflowAction(v));
        await PerformActions(actions, id, userId, roles);
    }

    public async Task<FullItem> NewItem(Guid formType, Guid userId, IList<string> roles)
    {
        List<ItemAction> actions = [EditMetadataAction.Sync(o => o)];
        var id = await PerformActions(actions, null, userId, roles, formType);
        return await GetFullItem(id, userId, roles);
    }

    public async Task<List<Guid>> GetPreviewItemIdsByType(Guid type)
    {
        return await Items
            .Where(x => x.FormData.Type == type)
            .Select(x => x.Id)
            .Take(10)
            .ToListAsync();
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

    public async Task ExportCsvByType(
        List<ItemAction> actions,
        IEnumerable<Guid> itemIds,
        Guid type,
        Guid userId,
        IList<string> roles)
    {
        var allIds = await Items
            .Where(x => x.FormData.Type == type && itemIds.Contains(x.Id))
            .Select(x => x.Id)
            .ToListAsync();

        var items = await LoadItemData(allIds, actions, userId, roles, type, true);
        foreach (var item in items)
        {
            await ApplyItemChanges(item);
        }
        await SaveChanges();
    }
}

public record SimpleItemWorkflowContext(
    string Status,
    DateTime CreatedAt,
    DateTime? SubmittedAt,
    Guid CurrentUser,
    IList<string> Roles
) : IItemWorkflowContext;
