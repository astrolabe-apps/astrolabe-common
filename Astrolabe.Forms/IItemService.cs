using Astrolabe.Schemas;
using Astrolabe.SearchState;

namespace Astrolabe.Forms;

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

    // CRUD convenience
    Task<Guid> CreateItem(Guid formType, ItemEdit edit, Guid userId, IList<string> roles);
    Task EditItem(Guid id, ItemEdit edit, Guid userId, IList<string> roles);
    Task<ItemView> NewItem(Guid formType, Guid userId, IList<string> roles);

    // Detail & actions
    Task<ItemView> GetItemView(Guid id, Guid userId, IList<string> roles);
    Task<ItemView> GetUserItem(Guid id, Guid userId, IList<string> roles);
    Task<IEnumerable<string>> GetUserActions(Guid id, Guid userId, IList<string> roles);
    Task DeleteItem(Guid id);
    Task<Guid> PerformActions(
        IEnumerable<ItemAction> actions,
        Guid? id,
        Guid userId,
        IList<string> roles,
        Guid? formType = null
    );
    Task BulkPerformActions(List<ItemAction> actions, Guid userId, IList<string> roles);
    Task AddItemNote(Guid itemId, string message, bool isInternal, Guid userId);
}