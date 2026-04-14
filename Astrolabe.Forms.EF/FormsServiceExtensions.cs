using Astrolabe.FileStorage;
using Astrolabe.FormItems;
using Astrolabe.Workflow;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Astrolabe.Forms.EF;

public static class FormsServiceExtensions
{
    public static IServiceCollection AddFormsServices<TDbContext>(this IServiceCollection services)
        where TDbContext : DbContext
    {
        services.AddScoped<EfItemService>(sp => new EfItemService(
            sp.GetRequiredService<TDbContext>(),
            sp.GetService<IEnumerable<FormRule>>(),
            sp.GetService<WorkflowRuleList<string, IItemWorkflowContext>>()
        ));
        services.AddScoped<IItemService>(sp => sp.GetRequiredService<EfItemService>());
        services.AddScoped<IItemActionService>(sp => sp.GetRequiredService<EfItemService>());

        services.AddScoped<IItemFileService>(sp => new EfItemFileService(
            sp.GetRequiredService<TDbContext>(),
            sp.GetService<IFileStorage<ItemFile>>()
        ));

        services.AddScoped<IItemExportService>(sp => new EfItemExportService(
            sp.GetRequiredService<TDbContext>(),
            sp.GetRequiredService<EfItemService>()
        ));

        services.AddScoped<IItemFormService>(sp => new EfItemFormService(
            sp.GetRequiredService<TDbContext>(),
            sp.GetRequiredService<EfItemService>()
        ));

        services.AddScoped<EfPersonService>(sp => new EfPersonService(
            sp.GetRequiredService<TDbContext>()
        ));

        return services;
    }
}
