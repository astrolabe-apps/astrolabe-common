using Astrolabe.Common.Exceptions;
using Astrolabe.SearchState;
using Microsoft.EntityFrameworkCore;

namespace Astrolabe.FormDesigner.EF;

public class EfExportDefinitionService<TExportDef>(DbContext dbContext) : IExportDefinitionService
    where TExportDef : class, IExportDefinitionEntity, new()
{
    private DbSet<TExportDef> ExportDefinitions => dbContext.Set<TExportDef>();

    private static readonly Searcher<TExportDef, NameId> ExportSearcher =
        SearchHelper.CreateSearcher<TExportDef, NameId>(
            async q => await q.Select(x => new NameId(x.Name, x.Id)).ToListAsync(),
            async q => await q.CountAsync()
        );

    public async Task<SearchResults<NameId>> SearchExportDefinitions(SearchOptions request, bool includeTotal)
    {
        return await ExportSearcher(ExportDefinitions, request, includeTotal);
    }

    public async Task<ExportDefinitionEdit> GetExportDefinition(Guid id)
    {
        var def = await ExportDefinitions.FindAsync(id);
        NotFoundException.ThrowIfNull(def);
        return new ExportDefinitionEdit(
            def.TableDefinitionId,
            def.Name,
            def.ExportColumns
        );
    }

    public async Task<Guid> CreateExportDefinition(ExportDefinitionEdit edit)
    {
        var def = new TExportDef
        {
            Id = Guid.NewGuid(),
            TableDefinitionId = edit.TableDefinitionId,
            Name = edit.Name,
            ExportColumns = edit.ExportColumns,
        };
        ExportDefinitions.Add(def);
        await dbContext.SaveChangesAsync();
        return def.Id;
    }

    public async Task EditExportDefinition(Guid id, ExportDefinitionEdit edit)
    {
        var def = await ExportDefinitions.FindAsync(id);
        NotFoundException.ThrowIfNull(def);
        def.TableDefinitionId = edit.TableDefinitionId;
        def.Name = edit.Name;
        def.ExportColumns = edit.ExportColumns;
        await dbContext.SaveChangesAsync();
    }

    public async Task DeleteExportDefinition(Guid id)
    {
        var def = await ExportDefinitions.FindAsync(id);
        NotFoundException.ThrowIfNull(def);
        ExportDefinitions.Remove(def);
        await dbContext.SaveChangesAsync();
    }
}
