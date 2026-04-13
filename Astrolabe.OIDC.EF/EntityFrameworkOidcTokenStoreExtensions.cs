using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Astrolabe.OIDC.EF;

public static class EntityFrameworkOidcTokenStoreExtensions
{
    /// <summary>
    /// Registers the EF Core implementation of <see cref="IOidcTokenStore"/>.
    /// Must be called before <c>AddOidcEndpoints</c> to override the default in-memory store.
    /// </summary>
    public static IServiceCollection AddEfOidcTokenStore<TContext>(this IServiceCollection services)
        where TContext : DbContext, IOidcStoreDbContext
    {
        services.AddScoped<IOidcTokenStore, EntityFrameworkOidcTokenStore<TContext>>();
        return services;
    }
}
