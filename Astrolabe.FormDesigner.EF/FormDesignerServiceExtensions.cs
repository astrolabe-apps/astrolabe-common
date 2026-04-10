using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Astrolabe.FormDesigner.EF;

public static class FormDesignerServiceExtensions
{
    public static IServiceCollection AddFormDesignerServices<TDbContext, TFormDef, TTableDef, TExportDef>(
        this IServiceCollection services)
        where TDbContext : DbContext
        where TFormDef : class, IFormDefinitionEntity, new()
        where TTableDef : class, ITableDefinitionEntity, new()
        where TExportDef : class, IExportDefinitionEntity, new()
    {
        services.AddScoped<IFormDefinitionService>(sp =>
            new EfFormDefinitionService<TFormDef>(sp.GetRequiredService<TDbContext>()));
        services.AddScoped<ITableDefinitionService>(sp =>
            new EfTableDefinitionService<TTableDef>(sp.GetRequiredService<TDbContext>()));
        services.AddScoped<IExportDefinitionService>(sp =>
            new EfExportDefinitionService<TExportDef>(sp.GetRequiredService<TDbContext>()));
        return services;
    }
}
