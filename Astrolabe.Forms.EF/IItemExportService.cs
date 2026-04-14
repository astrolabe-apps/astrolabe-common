using Astrolabe.Schemas.ExportCsv;
using Astrolabe.SearchState;

namespace Astrolabe.Forms.EF;

public interface IItemExportService
{
    Task<IEnumerable<ExportDefinitionGroup>> GetExportDefinitionOfForms(
        IEnumerable<Guid> formItemIds
    );
    Task<List<Guid>> GetExportableItemIds(SearchOptions searchOptions);
    Task WriteCsvText(
        IEnumerable<ExportColumn> exportColumns,
        IEnumerable<Guid> itemIds,
        Guid tableDefinitionId,
        Guid userId,
        IList<string> roles,
        Stream stream
    );
}
