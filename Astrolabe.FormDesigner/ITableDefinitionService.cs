using Astrolabe.SearchState;

namespace Astrolabe.FormDesigner;

public interface ITableDefinitionService
{
    Task<SearchResults<NameId>> SearchTables(SearchOptions request, bool includeTotal);
    Task<TableDefinitionEdit> GetTable(Guid tableId);
    Task<Guid> CreateTable(TableDefinitionEdit edit);
    Task EditTable(Guid tableId, TableDefinitionEdit edit);
    Task DeleteTable(Guid tableId);
}
