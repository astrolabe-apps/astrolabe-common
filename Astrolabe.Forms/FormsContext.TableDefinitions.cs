using Astrolabe.Annotation;
using Astrolabe.Common.Exceptions;
using Astrolabe.Schemas;
using Microsoft.EntityFrameworkCore;

namespace Astrolabe.Forms;

public partial class FormsContext<
    TItem, TFormData, TPerson, TFormDef, TTableDef,
    TAuditEvent, TItemTag, TItemNote, TItemFile, TExportDef>
{
    public async Task<IEnumerable<ScopedNameId>> ListTables()
    {
        return await TableDefinitions
            .Select(x => new ScopedNameId(
                x.Name!,
                x.Id,
                Scopes.GroupScopedId(x.GroupId, x.ShortId)
            ))
            .ToListAsync();
    }

    public static IQueryable<TableDefinitionEdit> ToTableEdit(IQueryable<TTableDef> query)
    {
        return query.Select(x => new TableDefinitionEdit(
            x.ShortId,
            x.Name,
            x.GroupId,
            x.NameField,
            DbJson.FromJson<IEnumerable<object>>(x.Fields),
            Array.Empty<string>()
        ));
    }

    public async Task<TableDefinitionEdit> GetTable(Guid tableId)
    {
        var tableDefEdit = await ToTableEdit(TableDefinitions.Where(x => x.Id == tableId))
            .SingleOrDefaultAsync();
        NotFoundException.ThrowIfNull(tableDefEdit);
        return tableDefEdit;
    }

    public async Task<TableDefinitionEdit?> GetTableForFullScope(string fullTableId)
    {
        var (groupId, shortId) = Scopes.SplitGroupScopedId(fullTableId);
        return await ToTableEdit(
                TableDefinitions.Where(x => x.GroupId == groupId && x.ShortId == shortId))
            .SingleOrDefaultAsync();
    }

    public IQueryable<TTableDef> QueryTableDefForFullScope(string fullTableId)
    {
        var (groupId, shortId) = Scopes.SplitGroupScopedId(fullTableId);
        return TableDefinitions.Where(x => x.GroupId == groupId && x.ShortId == shortId);
    }

    public async Task<TTableDef?> GetTableDefForFullScope(string fullTableId)
    {
        return await QueryTableDefForFullScope(fullTableId).SingleOrDefaultAsync();
    }

    public async Task<TTableDef?> GetTableDef(Guid tableId)
    {
        return await TableDefinitions.Where(x => x.Id == tableId).SingleOrDefaultAsync();
    }

    public async Task DeleteTable(Guid tableId)
    {
        var table = await TableDefinitions.Where(x => x.Id == tableId).SingleOrDefaultAsync();
        if (table != null)
        {
            TableDefinitions.Remove(table);
            await SaveChanges();
        }
    }
}

public record TableDefinitionEdit(
    string? ShortId,
    string? Name,
    string? GroupId,
    [property: SchemaTag(SchemaTags.SchemaField)] string? NameField,
    IEnumerable<object> Fields,
    IEnumerable<string> Tags
);
