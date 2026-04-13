using Astrolabe.Common.Exceptions;
using Astrolabe.SearchState;
using Microsoft.EntityFrameworkCore;

namespace Astrolabe.FormDesigner.EF;

public class EfFormDefinitionService<TFormDef>(DbContext dbContext) : IFormDefinitionService
    where TFormDef : class, IFormDefinitionEntity, new()
{
    private DbSet<TFormDef> FormDefinitions => dbContext.Set<TFormDef>();

    private static readonly Searcher<TFormDef, NameId> FormSearcher =
        SearchHelper.CreateSearcher<TFormDef, NameId>(
            async q => await q.Select(x => new NameId(x.Name!, x.Id)).ToListAsync(),
            async q => await q.CountAsync()
        );

    public async Task<SearchResults<NameId>> SearchForms(SearchOptions request, bool includeTotal)
    {
        return await FormSearcher(FormDefinitions, request, includeTotal);
    }

    public async Task<FormDefinitionEdit> GetForm(Guid formId)
    {
        var form = await FormDefinitions
            .Where(x => x.Id == formId)
            .AsNoTracking()
            .SingleOrDefaultAsync();
        NotFoundException.ThrowIfNull(form);
        return new FormDefinitionEdit(
            form.Name!,
            form.TableId,
            DbJson.FromJson<IEnumerable<object>>(form.Definition),
            form.Public,
            form.Published,
            form.LayoutMode,
            form.NavigationStyle
        );
    }

    public async Task<Guid> CreateForm(FormDefinitionEdit edit)
    {
        var form = new TFormDef
        {
            Id = Guid.NewGuid(),
            Name = edit.Name,
            TableId = edit.TableId,
            Definition = DbJson.ToJson(edit.Controls),
            Version = 1,
            Public = edit.Public,
            Published = edit.Published,
            LayoutMode = edit.LayoutMode,
            NavigationStyle = edit.NavigationStyle,
        };
        FormDefinitions.Add(form);
        await dbContext.SaveChangesAsync();
        return form.Id;
    }

    public async Task EditForm(Guid formId, FormDefinitionEdit edit)
    {
        var form = await FormDefinitions
            .Where(x => x.Id == formId)
            .SingleOrDefaultAsync();
        NotFoundException.ThrowIfNull(form);
        form.Name = edit.Name;
        form.TableId = edit.TableId;
        form.Definition = DbJson.ToJson(edit.Controls);
        form.Public = edit.Public;
        form.Published = edit.Published;
        form.LayoutMode = edit.LayoutMode;
        form.NavigationStyle = edit.NavigationStyle;
        await dbContext.SaveChangesAsync();
    }

    public async Task DeleteForm(Guid formId)
    {
        var form = await FormDefinitions.FirstOrDefaultAsync(x => x.Id == formId);
        if (form != null)
        {
            FormDefinitions.Remove(form);
            await dbContext.SaveChangesAsync();
        }
    }
}
