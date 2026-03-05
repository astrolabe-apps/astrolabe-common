using System.Text.Json;
using Astrolabe.EF.Search;
using Astrolabe.JSON.Extensions;
using Astrolabe.Workflow;
using Microsoft.EntityFrameworkCore;

namespace Astrolabe.Forms;

public abstract partial class FormsContext<
    TItem, TFormData, TPerson, TFormDef, TTableDef,
    TAuditEvent, TItemTag, TItemNote, TItemFile, TExportDef>
    : IFormsContext
    where TItem : class, IItem<TPerson, TFormData, TItemTag, TItemNote>, new()
    where TFormData : class, IFormData<TPerson, TFormDef>, new()
    where TPerson : class, IPerson, new()
    where TFormDef : class, IFormDefinition<TTableDef>
    where TTableDef : class, ITableDefinition
    where TAuditEvent : class, IAuditEvent<TPerson>, new()
    where TItemTag : class, IItemTag, new()
    where TItemNote : class, IItemNote<TPerson>, new()
    where TItemFile : class, IItemFile
    where TExportDef : class, IExportDefinition<TTableDef>, new()
{
    protected abstract DbContext DbContext { get; }

    protected DbSet<TItem> Items => DbContext.Set<TItem>();
    protected DbSet<TFormData> FormDataSet => DbContext.Set<TFormData>();
    protected DbSet<TPerson> Persons => DbContext.Set<TPerson>();
    protected DbSet<TFormDef> FormDefinitions => DbContext.Set<TFormDef>();
    protected DbSet<TTableDef> TableDefinitions => DbContext.Set<TTableDef>();
    protected DbSet<TAuditEvent> AuditEvents => DbContext.Set<TAuditEvent>();
    protected DbSet<TItemTag> ItemTags => DbContext.Set<TItemTag>();
    protected DbSet<TItemNote> ItemNotes => DbContext.Set<TItemNote>();
    protected DbSet<TItemFile> ItemFiles => DbContext.Set<TItemFile>();
    protected DbSet<TExportDef> ExportDefinitions => DbContext.Set<TExportDef>();

    protected Task<int> SaveChanges() => DbContext.SaveChangesAsync();

    public virtual List<FormRule> FormRules => [];

    public virtual WorkflowRuleList<string, IItemWorkflowContext> WorkflowRules
        => DefaultWorkflowRules.Default;

    private static readonly SimpleSearchIndexer<ItemIndexDocument> Indexer = new(
        new JsonSerializerOptions().AddStandardOptions()
    );
}
