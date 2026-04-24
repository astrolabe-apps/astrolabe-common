using Astrolabe.Common.Exceptions;
using Astrolabe.SearchState;
using Microsoft.EntityFrameworkCore;

namespace Astrolabe.FormDesigner.EF;

public class EfFormDefinitionService(DbContext dbContext) : IFormDefinitionService
{
    private DbSet<FormDefinition> FormDefinitions => dbContext.Set<FormDefinition>();

    private static readonly Searcher<FormDefinition, NameId> FormSearcher =
        SearchHelper.CreateSearcher<FormDefinition, NameId>(
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
            form.NavigationStyle,
            form.SystemId
        );
    }

    public async Task<Guid> CreateForm(FormDefinitionEdit edit)
    {
        var form = new FormDefinition
        {
            Id = Guid.NewGuid(),
            Name = edit.Name,
            TableId = edit.TableId,
            Definition = edit.SystemId != null ? "[]" : DbJson.ToJson(edit.Controls),
            Version = 1,
            Public = edit.Public,
            Published = edit.Published,
            LayoutMode = edit.LayoutMode,
            NavigationStyle = edit.NavigationStyle,
            SystemId = edit.SystemId,
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
        form.Definition = form.SystemId != null ? "[]" : DbJson.ToJson(edit.Controls);
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

    public async Task<Guid> GetOrCreateSystemForm(string systemId)
    {
        var existing = await FormDefinitions
            .Where(x => x.SystemId == systemId)
            .Select(x => (Guid?)x.Id)
            .FirstOrDefaultAsync();
        if (existing.HasValue)
            return existing.Value;

        var form = new FormDefinition
        {
            Id = Guid.NewGuid(),
            Name = systemId,
            SystemId = systemId,
            Definition = "[]",
            Version = 1,
            Public = false,
            Published = true,
            LayoutMode = FormLayoutMode.SinglePage,
            NavigationStyle = PageNavigationStyle.Wizard,
        };
        FormDefinitions.Add(form);
        await dbContext.SaveChangesAsync();
        return form.Id;
    }
}
