using System.Security.Claims;
using Astrolabe.FileStorage;
using Astrolabe.Schemas;
using Astrolabe.Schemas.ExportCsv;
using Astrolabe.SearchState;

namespace Astrolabe.Forms;

public record FormsUser(Guid PersonId, IList<string> Roles);

public interface IFormsContext
{
    // Auth — each app implements claim-to-person mapping
    Task<FormsUser> ResolveUser(ClaimsPrincipal principal);

    // Form Definitions
    Task<IEnumerable<FormInfo>> ListForms(bool? forPublic = null, bool? published = null);
    Task<FormAndSchemas> GetFormAndSchemas(Guid formId);
    Task<FormDefinitionEdit> GetFormEdit(Guid formId);
    Task<Guid> CreateForm(FormDefinitionEdit edit);
    Task EditForm(Guid formId, FormDefinitionEdit edit);
    Task DeleteForm(Guid id);

    // Table Definitions
    Task<IEnumerable<ScopedNameId>> ListTables();
    Task<TableDefinitionEdit> GetTable(Guid tableId);
    Task<Guid> CreateTable(TableDefinitionEdit edit);
    Task EditTable(Guid tableId, TableDefinitionEdit edit);
    Task DeleteTable(Guid tableId);

    // Items — search
    Task<SearchResults<ItemInfo>> SearchItems(SearchOptions request, bool includeTotal, Guid currentUserId);
    Task<SearchResults<ItemInfo>> SearchItemsAdmin(SearchOptions request, bool includeTotal);
    Task<Dictionary<string, IEnumerable<FieldOption>>> GetFilterOptions();

    // Items — convenience CRUD
    Task<Guid> CreateItem(Guid formType, ItemEdit edit, Guid userId, IList<string> roles);
    Task EditItem(Guid id, ItemEdit edit, Guid userId, IList<string> roles);
    Task<ItemView> NewItem(Guid formType, Guid userId, IList<string> roles);

    // Items — detail & actions
    Task<ItemView> GetItemView(Guid id, Guid userId, IList<string> roles);
    Task<ItemView> GetUserItem(Guid id, Guid userId, IList<string> roles);
    Task<IEnumerable<string>> GetUserActions(Guid id, Guid userId, IList<string> roles);
    Task DeleteItem(Guid id);
    Task<Guid> PerformActions(IEnumerable<ItemAction> actions, Guid? id, Guid userId, IList<string> roles, Guid? formType = null);
    Task BulkPerformActions(List<ItemAction> actions, Guid userId, IList<string> roles);
    Task AddItemNote(Guid itemId, string message, bool isInternal, Guid userId);

    // Files
    Task<FormUpload> UploadFile(Guid personId, Guid? itemId, Stream stream, string fileName);
    Task DeleteFile(Guid personId, Guid? itemId, Guid fileId);
    Task<DownloadResponse?> DownloadFile(Guid personId, Guid? itemId, Guid fileId);

    // Export Definitions
    Task<IEnumerable<ExportDefinitionGroup>> ListExportDefinitions();
    Task<ExportDefinitionEdit> GetExportDefinition(Guid? id);
    Task CreateOrUpdateExportDefinition(ExportDefinitionEdit edit);
    Task DeleteExportDefinition(Guid id);

    // Export CSV
    Task<IEnumerable<ExportDefinitionGroup>> GetExportDefinitionOfForms(IEnumerable<Guid> formItemIds);
    Task<List<Guid>> GetExportableItemIds(SearchOptions searchOptions);
    Task<string?> GetCsvText(IEnumerable<ExportColumn> exportColumns, IEnumerable<Guid> itemIds,
        Guid tableDefinitionId, Guid userId, IList<string> roles);
}
