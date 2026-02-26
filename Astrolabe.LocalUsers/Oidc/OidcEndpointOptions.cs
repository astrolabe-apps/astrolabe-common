namespace Astrolabe.LocalUsers.Oidc;

/// <summary>
/// Options to enable/disable specific OIDC endpoints.
/// </summary>
public class OidcEndpointOptions
{
    public bool EnableDiscovery { get; set; } = true;
    public bool EnableJwks { get; set; } = true;
    public bool EnableAuthorize { get; set; } = true;
    public bool EnableAuthorizeComplete { get; set; } = true;
    public bool EnableToken { get; set; } = true;
    public bool EnableEndSession { get; set; } = true;
}
