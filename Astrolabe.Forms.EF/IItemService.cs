using Astrolabe.Schemas;
using Astrolabe.SearchState;

namespace Astrolabe.Forms.EF;

/// <summary>
/// The Forms-layer item service, holding the non-minimal concerns (search,
/// detail views, notes, indexing-aware bulk). Individual CRUD is handled by
/// <see cref="IItemActionService"/> from Astrolabe.FormItems.
/// </summary>
public interface IItemService
{
    // Search
    Task<SearchResults<ItemInfo>> SearchItems(
        SearchOptions request,
        bool includeTotal,
        Guid currentUserId
    );
    Task<SearchResults<ItemInfo>> SearchItemsAdmin(SearchOptions request, bool includeTotal);
    Task<Dictionary<string, IEnumerable<FieldOption>>> GetFilterOptions();

    // Detail
    Task<ItemView> NewItem(Guid formType, Guid userId, IList<string> roles);
    Task<ItemView> GetItemView(Guid id, Guid userId, IList<string> roles);
    Task<ItemView> GetUserItem(Guid id, Guid userId, IList<string> roles);
    Task<IEnumerable<string>> GetUserActions(Guid id, Guid userId, IList<string> roles);

    // Bulk — runs a fixed action list across every item (e.g. full reindex)
    Task BulkPerformActions(List<IItemAction> actions, Guid userId, IList<string> roles);

    // Notes
    Task AddItemNote(Guid itemId, string message, bool isInternal, Guid userId);
}
