namespace Astrolabe.OIDC;

/// <summary>
/// Configuration for a registered OIDC client.
/// </summary>
public class OidcClientConfig
{
    /// <summary>
    /// The client identifier.
    /// </summary>
    public required string ClientId { get; set; }

    /// <summary>
    /// Allowed redirect URIs for the authorization code flow.
    /// </summary>
    public List<string> RedirectUris { get; set; } = [];

    /// <summary>
    /// Allowed post-logout redirect URIs.
    /// </summary>
    public List<string> PostLogoutRedirectUris { get; set; } = [];
}
