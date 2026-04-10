using Astrolabe.Common.Exceptions;
using Astrolabe.SearchState;
using Microsoft.EntityFrameworkCore;

namespace Astrolabe.FormDesigner.EF;

public class EfTableDefinitionService<TTableDef>(DbContext dbContext) : ITableDefinitionService
    where TTableDef : class, ITableDefinitionEntity, new()
{
    private DbSet<TTableDef> TableDefinitions => dbContext.Set<TTableDef>();

    private static readonly Searcher<TTableDef, NameId> TableSearcher =
        SearchHelper.CreateSearcher<TTableDef, NameId>(
            async q => await q.Select(x => new NameId(x.Name!, x.Id)).ToListAsync(),
            async q => await q.CountAsync()
        );

    public async Task<SearchResults<NameId>> SearchTables(SearchOptions request, bool includeTotal)
    {
        return await TableSearcher(TableDefinitions, request, includeTotal);
    }

    public async Task<TableDefinitionEdit> GetTable(Guid tableId)
    {
        var table = await TableDefinitions
            .Where(x => x.Id == tableId)
            .AsNoTracking()
            .SingleOrDefaultAsync();
        NotFoundException.ThrowIfNull(table);
        return new TableDefinitionEdit(
            table.Name,
            table.NameField,
            DbJson.FromJson<IEnumerable<object>>(table.Fields),
            Array.Empty<string>()
        );
    }

    public async Task<Guid> CreateTable(TableDefinitionEdit edit)
    {
        var table = new TTableDef
        {
            Id = Guid.NewGuid(),
            Name = edit.Name,
            NameField = edit.NameField,
            Fields = DbJson.ToJson(edit.Fields),
            Updated = DateTime.UtcNow,
        };
        TableDefinitions.Add(table);
        await dbContext.SaveChangesAsync();
        return table.Id;
    }

    public async Task EditTable(Guid tableId, TableDefinitionEdit edit)
    {
        var table = await TableDefinitions
            .Where(x => x.Id == tableId)
            .SingleOrDefaultAsync();
        NotFoundException.ThrowIfNull(table);
        table.Name = edit.Name;
        table.NameField = edit.NameField;
        table.Fields = DbJson.ToJson(edit.Fields);
        table.Updated = DateTime.UtcNow;
        await dbContext.SaveChangesAsync();
    }

    public async Task DeleteTable(Guid tableId)
    {
        var table = await TableDefinitions.FirstOrDefaultAsync(x => x.Id == tableId);
        if (table != null)
        {
            TableDefinitions.Remove(table);
            await dbContext.SaveChangesAsync();
        }
    }
}
