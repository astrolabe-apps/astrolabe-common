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
            .Include(x => x.Table)
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
            GetFormConfig(formDef),
            tableDef.ShortId!,
            schemas
        );
    }

    /// <summary>
    /// Override to provide form-specific config (e.g. layout mode, navigation style).
    /// </summary>
    protected virtual object? GetFormConfig(TFormDef formDef) => null;

    /// <summary>
    /// Override to apply form-specific config to the entity.
    /// </summary>
    protected virtual void SetFormConfig(TFormDef formDef, FormConfig config) { }

    /// <summary>
    /// Override to validate form definition edits before create/update. Throw <see cref="FormsValidationException"/> on failure.
    /// </summary>
    protected virtual Task ValidateFormEdit(FormDefinitionEdit edit) => Task.CompletedTask;

    public async Task<FormDefinitionEdit> GetFormEdit(Guid formId)
    {
        var form = await FormDefinitions
            .Where(x => x.Id == formId)
            .AsNoTracking()
            .SingleOrDefaultAsync();
        NotFoundException.ThrowIfNull(form);
        return new FormDefinitionEdit(
            form.ShortId!,
            form.Name!,
            form.GroupId!,
            form.TableId,
            DbJson.FromJson<IEnumerable<object>>(form.Definition),
            (FormConfig)(GetFormConfig(form) ?? new FormConfig())
        );
    }

    public async Task<Guid> CreateForm(FormDefinitionEdit edit)
    {
        await ValidateFormEdit(edit);
        var form = new TFormDef
        {
            Id = Guid.NewGuid(),
            ShortId = edit.ShortId,
            Name = edit.Name,
            GroupId = edit.GroupId,
            TableId = edit.TableId,
            Definition = DbJson.ToJson(edit.Controls),
            Version = 1,
        };
        SetFormConfig(form, edit.Config);
        FormDefinitions.Add(form);
        await SaveChanges();
        return form.Id;
    }

    public async Task EditForm(Guid formId, FormDefinitionEdit edit)
    {
        await ValidateFormEdit(edit);
        var form = await FormDefinitions
            .Where(x => x.Id == formId)
            .Include(x => x.Table)
            .SingleOrDefaultAsync();
        NotFoundException.ThrowIfNull(form);
        form.ShortId = edit.ShortId;
        form.Name = edit.Name;
        form.GroupId = edit.GroupId;
        form.TableId = edit.TableId;
        form.Definition = DbJson.ToJson(edit.Controls);
        SetFormConfig(form, edit.Config);
        await SaveChanges();
    }

    public async Task DeleteForm(Guid id)
    {
        var form = await FormDefinitions.FirstOrDefaultAsync(x => x.Id == id);
        if (form != null)
        {
            FormDefinitions.Remove(form);
            await SaveChanges();
        }
    }

    public async Task<Guid?> LookupForm(string formName)
    {
        return await QueryFormDefForFullScope(formName)
            .Select(x => (Guid?)x.Id)
            .SingleOrDefaultAsync();
    }

    public IQueryable<TFormDef> QueryFormDefForFullScope(string formName)
    {
        var (groupId, shortId) = Scopes.SplitGroupScopedId(formName);
        return FormDefinitions.Where(x => x.GroupId == groupId && x.ShortId == shortId);
    }
}
