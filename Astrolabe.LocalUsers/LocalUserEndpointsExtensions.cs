using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace Astrolabe.LocalUsers;

public static class LocalUserEndpointsExtensions
{
    /// <summary>
    /// Registers the local user endpoints class and its dependencies in the DI container.
    /// </summary>
    public static IServiceCollection AddLocalUserEndpoints<TEndpoints, TNewUser, TUserId>(
        this IServiceCollection services,
        LocalUserEndpointOptions? options = null)
        where TEndpoints : LocalUserEndpoints<TNewUser, TUserId>
        where TNewUser : ICreateNewUser
    {
        if (options != null)
        {
            services.AddSingleton(options);
        }
        else
        {
            services.AddSingleton(new LocalUserEndpointOptions());
        }

        services.AddScoped<TEndpoints>();
        return services;
    }

    /// <summary>
    /// Registers the local user endpoints class with a custom options configuration.
    /// </summary>
    public static IServiceCollection AddLocalUserEndpoints<TEndpoints, TNewUser, TUserId>(
        this IServiceCollection services,
        Action<LocalUserEndpointOptions> configureOptions)
        where TEndpoints : LocalUserEndpoints<TNewUser, TUserId>
        where TNewUser : ICreateNewUser
    {
        var options = new LocalUserEndpointOptions();
        configureOptions(options);
        return services.AddLocalUserEndpoints<TEndpoints, TNewUser, TUserId>(options);
    }

    /// <summary>
    /// Maps the local user endpoints to the specified route prefix.
    /// </summary>
    public static RouteGroupBuilder MapLocalUserEndpoints<TEndpoints, TNewUser, TUserId>(
        this IEndpointRouteBuilder endpoints,
        string routePrefix)
        where TEndpoints : LocalUserEndpoints<TNewUser, TUserId>
        where TNewUser : ICreateNewUser
    {
        var group = endpoints.MapGroup(routePrefix);

        using var scope = endpoints.ServiceProvider.CreateScope();
        var endpointsInstance = scope.ServiceProvider.GetRequiredService<TEndpoints>();
        endpointsInstance.MapEndpoints(group);

        return group;
    }

    /// <summary>
    /// Maps the local user endpoints to an existing route group.
    /// </summary>
    public static RouteGroupBuilder MapLocalUserEndpoints<TEndpoints, TNewUser, TUserId>(
        this RouteGroupBuilder group)
        where TEndpoints : LocalUserEndpoints<TNewUser, TUserId>
        where TNewUser : ICreateNewUser
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
