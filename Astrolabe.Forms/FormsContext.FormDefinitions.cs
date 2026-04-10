using Astrolabe.Common.Exceptions;
using Astrolabe.FormDesigner;
using Astrolabe.Schemas;
using Microsoft.EntityFrameworkCore;

namespace Astrolabe.Forms;

public partial class FormsContext<
    TItem,
    TFormData,
    TPerson,
    TFormDef,
    TTableDef,
    TAuditEvent,
    TItemTag,
    TItemNote,
    TItemFile,
    TExportDef
>
{
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
        var schemaName = tableDef.Name ?? tableDef.Id.ToString();
        var schemas = new Dictionary<string, IEnumerable<object>>
        {
            { schemaName, DbJson.FromJson<IEnumerable<SchemaField>>(tableDef.Fields) },
        };
        return new FormAndSchemas(
            DbJson.FromJson<IEnumerable<object>>(formDef.Definition),
            schemaName,
            schemas,
            new FormConfig(formDef.Public, formDef.Published, formDef.LayoutMode, formDef.NavigationStyle)
        );
    }

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
        await ValidateFormEdit(edit);
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
        form.Name = edit.Name;
        form.TableId = edit.TableId;
        form.Definition = DbJson.ToJson(edit.Controls);
        form.Public = edit.Public;
        form.Published = edit.Published;
        form.LayoutMode = edit.LayoutMode;
        form.NavigationStyle = edit.NavigationStyle;
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
}
