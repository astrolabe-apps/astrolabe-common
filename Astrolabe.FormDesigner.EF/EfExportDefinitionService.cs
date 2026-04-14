using Astrolabe.Common.Exceptions;
using Astrolabe.SearchState;
using Microsoft.EntityFrameworkCore;

namespace Astrolabe.FormDesigner.EF;

public class EfExportDefinitionService(DbContext dbContext) : IExportDefinitionService
{
    private DbSet<ExportDefinition> ExportDefinitions => dbContext.Set<ExportDefinition>();

    private static readonly Searcher<ExportDefinition, NameId> ExportSearcher =
        SearchHelper.CreateSearcher<ExportDefinition, NameId>(
            async q => await q.Select(x => new NameId(x.Name, x.Id)).ToListAsync(),
            async q => await q.CountAsync()
        );

    public async Task<SearchResults<NameId>> SearchExportDefinitions(
        SearchOptions request,
        bool includeTotal
    )
    {
        return await ExportSearcher(ExportDefinitions, request, includeTotal);
    }

    public async Task<ExportDefinitionEdit> GetExportDefinition(Guid id)
    {
        var def = await ExportDefinitions.FindAsync(id);
        NotFoundException.ThrowIfNull(def);
        return new ExportDefinitionEdit(def.TableDefinitionId, def.Name, def.ExportColumns);
    }

    public async Task<Guid> CreateExportDefinition(ExportDefinitionEdit edit)
    {
        var def = new ExportDefinition
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
