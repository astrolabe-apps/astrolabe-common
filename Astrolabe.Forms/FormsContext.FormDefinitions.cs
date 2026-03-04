using Astrolabe.Common.Exceptions;
using Astrolabe.Schemas;
using Microsoft.EntityFrameworkCore;

namespace Astrolabe.Forms;

public partial class FormsContext<
    TItem, TFormData, TPerson, TFormDef, TTableDef,
    TAuditEvent, TItemTag, TItemNote, TItemFile, TExportDef>
{
    public async Task<IEnumerable<FormInfo>> ListForms(
        bool? forPublic = null,
        bool? published = null)
    {
        var q = FormDefinitions.AsQueryable();
        if (forPublic.HasValue)
            q = q.Where(x => x.Public == forPublic.Value);
        if (published.HasValue)
            q = q.Where(x => x.Published == published.Value);
        return await q.Select(x => new FormInfo(x.Id, x.Name!, x.GroupId!)).ToListAsync();
    }

    public async Task<TFormDef?> GetFormDefinition(Guid formId)
    {
        return await FormDefinitions.Where(x => x.Id == formId).SingleOrDefaultAsync();
    }

    public async Task<FormAndSchemas> GetFormAndSchemas(Guid formId)
    {
        var formDef = await FormDefinitions
            .Where(x => x.Id == formId)
            .Select(x => new
            {
                x.ShortId,
                x.Name,
                x.GroupId,
                x.TableId,
                x.Definition,
                x.Table,
            })
            .AsNoTracking()
            .SingleOrDefaultAsync();
        NotFoundException.ThrowIfNull(formDef);
        var tableDef = formDef.Table;
        NotFoundException.ThrowIfNull(tableDef);
        var schemas = new Dictionary<string, IEnumerable<object>>
        {
            { tableDef.ShortId!, DbJson.FromJson<IEnumerable<SchemaField>>(tableDef.Fields) },
        };
        return new FormAndSchemas(
            DbJson.FromJson<IEnumerable<object>>(formDef.Definition),
            GetFormConfig(formDef.Table!),
            tableDef.ShortId!,
            schemas
        );
    }

    /// <summary>
    /// Override to provide form-specific config (e.g. layout mode, navigation style).
    /// </summary>
    protected virtual object? GetFormConfig(TTableDef tableDef) => null;

    public async Task DeleteForm(Guid id)
    {
        var form = await FormDefinitions.FirstOrDefaultAsync(x => x.Id == id);
        if (form != null)
        {
            FormDefinitions.Remove(form);
            await SaveChanges();
        }
    }

    public IQueryable<TFormDef> QueryFormDefForFullScope(string formName)
    {
        var (groupId, shortId) = Scopes.SplitGroupScopedId(formName);
        return FormDefinitions.Where(x => x.GroupId == groupId && x.ShortId == shortId);
    }
}
