using Astrolabe.SearchState;

namespace Astrolabe.FormDesigner;

public interface IExportDefinitionService
{
    Task<SearchResults<NameId>> SearchExportDefinitions(SearchOptions request, bool includeTotal);
    Task<ExportDefinitionEdit> GetExportDefinition(Guid id);
    Task<Guid> CreateExportDefinition(ExportDefinitionEdit edit);
    Task EditExportDefinition(Guid id, ExportDefinitionEdit edit);
    Task DeleteExportDefinition(Guid id);
}
