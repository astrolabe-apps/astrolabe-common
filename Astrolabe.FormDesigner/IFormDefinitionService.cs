using Astrolabe.SearchState;

namespace Astrolabe.FormDesigner;

public interface IFormDefinitionService
{
    Task<SearchResults<NameId>> SearchForms(SearchOptions request, bool includeTotal);
    Task<FormDefinitionEdit> GetForm(Guid formId);
    Task<Guid> CreateForm(FormDefinitionEdit edit);
    Task EditForm(Guid formId, FormDefinitionEdit edit);
    Task DeleteForm(Guid formId);
}
