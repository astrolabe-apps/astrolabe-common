namespace Astrolabe.OIDC;

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

    /// <summary>
    /// Enable the external providers list endpoint. Only takes effect when ExternalProviders is non-empty.
    /// </summary>
    public bool EnableExternalProviders { get; set; } = true;

    /// <summary>
    /// Enable the external login redirect endpoint. Only takes effect when ExternalProviders is non-empty.
    /// </summary>
    public bool EnableExternalLogin { get; set; } = true;

    /// <summary>
    /// Enable the external callback endpoint. Only takes effect when ExternalProviders is non-empty.
    /// </summary>
    public bool EnableExternalCallback { get; set; } = true;
}
