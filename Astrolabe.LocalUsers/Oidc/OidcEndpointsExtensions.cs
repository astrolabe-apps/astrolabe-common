using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Astrolabe.LocalUsers.Oidc;

public static class OidcEndpointsExtensions
{
    /// <summary>
    /// Registers the OIDC endpoints class and its dependencies in the DI container.
    /// </summary>
    public static IServiceCollection AddOidcEndpoints<TEndpoints>(
        this IServiceCollection services,
        OidcProviderConfig config,
        OidcEndpointOptions? options = null)
        where TEndpoints : OidcEndpoints
    {
        services.AddSingleton(config);
        services.AddSingleton(options ?? new OidcEndpointOptions());
        services.AddSingleton(new OidcTokenSigner(config));

        // Register in-memory store as default; consumers can replace with their own implementation
        services.TryAddSingleton<IOidcTokenStore, InMemoryOidcTokenStore>();

        services.AddScoped<TEndpoints>();
        return services;
    }

    /// <summary>
    /// Registers the OIDC endpoints class with a custom options configuration.
    /// </summary>
    public static IServiceCollection AddOidcEndpoints<TEndpoints>(
        this IServiceCollection services,
        OidcProviderConfig config,
        Action<OidcEndpointOptions> configureOptions)
        where TEndpoints : OidcEndpoints
    {
        var options = new OidcEndpointOptions();
        configureOptions(options);
        return services.AddOidcEndpoints<TEndpoints>(config, options);
    }

    /// <summary>
    /// Maps the OIDC endpoints to the specified route prefix.
    /// </summary>
    public static RouteGroupBuilder MapOidcEndpoints<TEndpoints>(
        this IEndpointRouteBuilder endpoints,
        string routePrefix)
        where TEndpoints : OidcEndpoints
    {
        var group = endpoints.MapGroup(routePrefix);

        using var scope = endpoints.ServiceProvider.CreateScope();
        var endpointsInstance = scope.ServiceProvider.GetRequiredService<TEndpoints>();
        endpointsInstance.MapEndpoints(group);

        return group;
    }

    /// <summary>
    /// Maps the OIDC endpoints to an existing route group.
    /// </summary>
    public static RouteGroupBuilder MapOidcEndpoints<TEndpoints>(
        this RouteGroupBuilder group)
        where TEndpoints : OidcEndpoints
    {
        var serviceProvider = GetServiceProvider(group);
        using var scope = serviceProvider.CreateScope();
        var endpointsInstance = scope.ServiceProvider.GetRequiredService<TEndpoints>();
        endpointsInstance.MapEndpoints(group);

        return group;
    }

    private static IServiceProvider GetServiceProvider(IEndpointRouteBuilder builder)
    {
        return builder.ServiceProvider;
    }
}
