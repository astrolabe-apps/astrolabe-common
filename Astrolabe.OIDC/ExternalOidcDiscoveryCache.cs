using System.Collections.Concurrent;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;

namespace Astrolabe.OIDC;

/// <summary>
/// Singleton that caches <see cref="ConfigurationManager{OpenIdConnectConfiguration}"/> per authority URL.
/// Handles auto-refresh of discovery documents and signing keys.
/// </summary>
public class ExternalOidcDiscoveryCache
{
    private readonly ConcurrentDictionary<string, ConfigurationManager<OpenIdConnectConfiguration>> _managers = new();

    /// <summary>
    /// Gets the OpenID Connect configuration for the specified authority.
    /// The configuration is cached and automatically refreshed.
    /// </summary>
    public async Task<OpenIdConnectConfiguration> GetConfiguration(string authority)
    {
        var manager = _managers.GetOrAdd(authority, a =>
        {
            var metadataAddress = a.TrimEnd('/') + "/.well-known/openid-configuration";
            return new ConfigurationManager<OpenIdConnectConfiguration>(
                metadataAddress,
                new OpenIdConnectConfigurationRetriever(),
                new HttpDocumentRetriever());
        });

        return await manager.GetConfigurationAsync(CancellationToken.None);
    }
}
