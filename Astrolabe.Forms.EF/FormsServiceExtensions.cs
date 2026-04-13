using Astrolabe.Forms;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Astrolabe.Forms.EF;

public static class FormsServiceExtensions
{
    public static IServiceCollection AddFormsServices<
        TDbContext,
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
    >(this IServiceCollection services)
        where TDbContext : DbContext
        where TItem : class, IItemEntity<TPerson, TFormData, TItemTag, TItemNote>, new()
        where TFormData : class, IFormDataEntity<TPerson, TFormDef>, new()
        where TPerson : class, IPerson, new()
        where TFormDef : class, IFormDefinitionEntity<TTableDef>, new()
        where TTableDef : class, ITableDefinition, new()
        where TAuditEvent : class, IAuditEventEntity<TPerson>, new()
        where TItemTag : class, IItemTag, new()
        where TItemNote : class, IItemNoteEntity<TPerson>, new()
        where TItemFile : class, IItemFile
        where TExportDef : class, IExportDefinitionEntity<TTableDef>, new()
    {
        services.AddScoped<
            EfItemService<
                TItem,
                TFormData,
                TPerson,
                TFormDef,
                TTableDef,
                TAuditEvent,
                TItemTag,
                TItemNote
            >
        >(sp => new EfItemService<
            TItem,
            TFormData,
            TPerson,
            TFormDef,
            TTableDef,
            TAuditEvent,
            TItemTag,
            TItemNote
        >(
            sp.GetRequiredService<TDbContext>(),
            sp.GetService<IEnumerable<FormRule>>(),
            sp.GetService<Astrolabe.Workflow.WorkflowRuleList<string, IItemWorkflowContext>>()
        ));
        services.AddScoped<IItemService>(sp =>
            sp.GetRequiredService<EfItemService<
                TItem,
                TFormData,
                TPerson,
                TFormDef,
                TTableDef,
                TAuditEvent,
                TItemTag,
                TItemNote
            >>()
        );

        services.AddScoped<IItemFileService>(sp => new EfItemFileService<TItemFile>(
            sp.GetRequiredService<TDbContext>(),
            sp.GetService<Astrolabe.FileStorage.IFileStorage<TItemFile>>()
        ));

        services.AddScoped<IItemExportService>(sp => new EfItemExportService<
            TItem,
            TFormData,
            TPerson,
            TFormDef,
            TTableDef,
            TAuditEvent,
            TItemTag,
            TItemNote,
            TExportDef
        >(
            sp.GetRequiredService<TDbContext>(),
            sp.GetRequiredService<EfItemService<
                TItem,
                TFormData,
                TPerson,
                TFormDef,
                TTableDef,
                TAuditEvent,
                TItemTag,
                TItemNote
            >>()
        ));

        services.AddScoped<IFormRenderingService>(sp => new EfFormRenderingService<
            TFormDef,
            TTableDef
        >(sp.GetRequiredService<TDbContext>()));

        services.AddScoped<EfPersonService<TPerson>>(sp => new EfPersonService<TPerson>(
            sp.GetRequiredService<TDbContext>()
        ));

        return services;
    }
}
