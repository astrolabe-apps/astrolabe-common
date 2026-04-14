using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Astrolabe.FormDesigner.EF;

public static class FormDesignerServiceExtensions
{
    public static IServiceCollection AddFormDesignerServices<TDbContext>(
        this IServiceCollection services
    )
        where TDbContext : DbContext
    {
        services.AddScoped<IFormDefinitionService>(sp =>
            new EfFormDefinitionService(sp.GetRequiredService<TDbContext>())
        );
        services.AddScoped<ITableDefinitionService>(sp =>
            new EfTableDefinitionService(sp.GetRequiredService<TDbContext>())
        );
        services.AddScoped<IExportDefinitionService>(sp =>
            new EfExportDefinitionService(sp.GetRequiredService<TDbContext>())
        );
        return services;
    }
}
